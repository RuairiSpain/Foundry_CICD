import os
import re
import sys
from typing import NotRequired, TypedDict, cast
from urllib.parse import parse_qs, unquote, urlsplit

import pg8000.dbapi  # type: ignore[import-untyped]

from foundry_control_plane.dev_push_store import Connection, PostgresPushStore
from foundry_control_plane.push_event import PushEvent


class ConnectionParameters(TypedDict):
    user: str
    password: str
    host: str
    port: int
    database: str
    startup_params: NotRequired[dict[str, str]]


def local_connection_parameters(value: str) -> ConnectionParameters:
    parsed = urlsplit(value)
    if (
        parsed.scheme not in ("postgres", "postgresql")
        or parsed.hostname not in ("127.0.0.1", "::1", "localhost")
        or not parsed.username
        or not parsed.path.startswith("/")
        or len(parsed.path) < 2
        or parsed.fragment
    ):
        raise ValueError("A local PostgreSQL connection is required.")
    query = parse_qs(parsed.query, keep_blank_values=True, strict_parsing=True)
    if set(query) - {"options"} or any(len(values) != 1 for values in query.values()):
        raise ValueError("Unsupported database connection options.")
    params: ConnectionParameters = {
        "user": unquote(parsed.username),
        "password": unquote(parsed.password or ""),
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": unquote(parsed.path[1:]),
    }
    if "options" in query:
        option = query["options"][0]
        if not re.fullmatch(r"-c search_path=[A-Za-z_][A-Za-z0-9_]{0,62}", option):
            raise ValueError("Unsupported database connection options.")
        params["startup_params"] = {"options": option}
    return params


def main() -> int:
    try:
        params = local_connection_parameters(os.environ.get("DATABASE_URL", ""))
        raw_event = sys.stdin.read(8193)
        if len(raw_event) > 8192:
            raise ValueError("Event is too large.")
        event = PushEvent.model_validate_json(raw_event)
        store = PostgresPushStore(
            lambda: cast(Connection, pg8000.dbapi.connect(**params, timeout=5))
        )
        store.record_push(event)
        return 0
    except Exception:  # noqa: BLE001 - command boundary must return a safe nonzero failure.
        print("Local worker failed; check the event and database.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
