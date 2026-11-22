import io
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import unquote, urlencode, urlsplit
from uuid import uuid4

import pg8000.dbapi
import pytest
from foundry_control_plane.dev_push_store import DeliveryConflict, PostgresPushStore
from foundry_control_plane.operations import OperationState
from foundry_control_plane.push_event import PushEvent


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://test:dummy@127.0.0.2:1/test",
        "postgresql://test:dummy@127.0.0.1:1/test?host=127.0.0.2",
        "postgresql://test:dummy@127.0.0.1:1/test#fragment",
    ],
)
def test_integration_database_rejects_unsafe_urls(url):
    with pytest.raises(ValueError, match="loopback PostgreSQL database without"):
        integration_database_parameters(url)


@pytest.fixture
def database():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.fail("TEST_DATABASE_URL must point to an isolated PostgreSQL database.")
    params = integration_database_parameters(url)
    schema = f"worker_test_{uuid4().hex}"
    admin = pg8000.dbapi.connect(**params)
    admin.autocommit = True
    admin.cursor().execute(f'CREATE SCHEMA "{schema}"')

    def connect():
        connection = pg8000.dbapi.connect(**params)
        connection.cursor().execute(f'SET search_path TO "{schema}"')
        return connection

    connect.database_url = f"{url}?{urlencode({'options': f'-c search_path={schema}'})}"
    try:
        yield connect
    finally:
        admin.cursor().execute(f'DROP SCHEMA "{schema}" CASCADE')
        admin.close()


def integration_database_parameters(url):
    parsed = urlsplit(url)
    if (
        parsed.scheme not in ("postgres", "postgresql")
        or parsed.hostname
        not in (
            "localhost",
            "127.0.0.1",
            "::1",
        )
        or "?" in url
        or "#" in url
    ):
        raise ValueError(
            "Integration tests require a loopback PostgreSQL database without query parameters or fragments."
        )
    return {
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
    }


def create_store(connect):
    return PostgresPushStore(connect), DeliveryConflict


def migrate(connect):
    connection = connect()
    try:
        sql = Path(
            "services/control-plane/migrations/001_dev_push_operations.sql"
        ).read_text(encoding="utf-8")
        connection.cursor().execute(sql)
        connection.commit()
    finally:
        connection.close()


def push():
    return PushEvent.model_validate(
        {
            "deliveryId": str(uuid4()),
            "installationId": "123",
            "repositoryId": "456",
            "ref": "refs/heads/main",
            "commitSha": "a" * 40,
            "bodyDigest": "b" * 64,
        }
    )


def test_push_recording_is_durable_idempotent_and_rejects_conflicting_redelivery(
    database,
):
    store, conflict = create_store(database)
    migrate(database)
    event = push()
    operation = store.record_push(event)
    assert operation.state == OperationState.ACCEPTED
    assert operation.tenant_id == "installation:123"
    assert store.record_push(event) == operation
    other_store, _ = create_store(database)
    assert other_store.record_push(event) == operation
    with pytest.raises(conflict):
        store.record_push(event.model_copy(update={"repository_id": "999"}))
    assert store.record_push(event) == operation


def test_concurrent_redeliveries_create_exactly_one_operation(database):
    store, _ = create_store(database)
    migrate(database)
    event = push()
    with ThreadPoolExecutor(max_workers=4) as executor:
        operations = list(executor.map(store.record_push, [event] * 4))
    assert len({operation.id for operation in operations}) == 1


def test_recording_a_push_creates_one_pending_mock_check(database):
    store, _ = create_store(database)
    migrate(database)
    event = push()
    operation = store.record_push(event)
    store.record_push(event)
    connection = database()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT operation_id, repository_id, commit_sha, status FROM dev_mock_checks"
        )
        rows = cursor.fetchall()
        assert list(rows) == [[operation.id, "456", "a" * 40, "queued"]]
    finally:
        connection.close()


def test_check_storage_failure_rolls_back_operation(database):
    store, _ = create_store(database)
    migrate(database)
    connection = database()
    try:
        connection.cursor().execute("DROP TABLE dev_mock_checks")
        connection.commit()
    finally:
        connection.close()
    with pytest.raises(pg8000.dbapi.DatabaseError):
        store.record_push(push())
    connection = database()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM dev_push_operations")
        assert cursor.fetchone() == [0]
    finally:
        connection.close()


def test_local_worker_processes_event_and_rejects_invalid_input(
    database, monkeypatch, capsys
):
    from foundry_control_plane.dev_worker import main

    migrate(database)
    event = push()
    monkeypatch.setenv("DATABASE_URL", database.database_url)
    monkeypatch.setattr(sys, "stdin", io.StringIO(event.model_dump_json(by_alias=True)))
    assert main() == 0
    connection = database()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT delivery_id FROM dev_push_operations")
        assert cursor.fetchone() == [event.delivery_id]
    finally:
        connection.close()
    monkeypatch.setattr(sys, "stdin", io.StringIO("x" * 8193))
    assert main() == 1
    assert "Local worker failed" in capsys.readouterr().err
