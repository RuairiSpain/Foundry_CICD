from collections.abc import Callable, Sequence
from typing import Protocol
from uuid import UUID, uuid4

from foundry_control_plane.operations import Operation
from foundry_control_plane.push_event import PushEvent


class Cursor(Protocol):
    def execute(self, query: str, args: tuple[object, ...]) -> object: ...

    def fetchone(self) -> Sequence[object] | None: ...


class Connection(Protocol):
    def cursor(self) -> Cursor: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def close(self) -> None: ...


class DeliveryConflict(ValueError):
    pass


class PostgresPushStore:
    """Local demonstration store; installation identifiers are not authorization."""

    def __init__(self, connect: Callable[[], Connection]) -> None:
        self._connect = connect

    def record_push(self, event: PushEvent) -> Operation:
        connection = self._connect()
        try:
            cursor = connection.cursor()
            cursor.execute(
                """
                INSERT INTO dev_push_operations
                    (delivery_id, operation_id, installation_id, repository_id, ref, commit_sha, body_digest)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (delivery_id) DO NOTHING
                """,
                (
                    event.delivery_id,
                    uuid4(),
                    event.installation_id,
                    event.repository_id,
                    event.ref,
                    event.commit_sha,
                    event.body_digest,
                ),
            )
            cursor.execute(
                """
                SELECT operation_id, installation_id, repository_id, ref, commit_sha, body_digest
                FROM dev_push_operations WHERE delivery_id = %s
                """,
                (event.delivery_id,),
            )
            row = cursor.fetchone()
            if row is None:
                raise RuntimeError("Persisted push operation could not be read.")
            if tuple(row[1:]) != (
                event.installation_id,
                event.repository_id,
                event.ref,
                event.commit_sha,
                event.body_digest,
            ):
                raise DeliveryConflict(
                    "Delivery ID already belongs to a different event."
                )
            operation = Operation(
                id=UUID(str(row[0])), tenant_id=f"installation:{event.installation_id}"
            )
            cursor.execute(
                """
                INSERT INTO dev_mock_checks (operation_id, repository_id, commit_sha, status)
                VALUES (%s, %s, %s, 'queued') ON CONFLICT (operation_id) DO NOTHING
                """,
                (operation.id, event.repository_id, event.commit_sha),
            )
            connection.commit()
            return operation
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
