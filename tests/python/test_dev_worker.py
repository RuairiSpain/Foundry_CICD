import pytest
from foundry_control_plane.dev_worker import local_connection_parameters


def test_local_worker_parses_loopback_database_connection():
    params = local_connection_parameters(
        "postgresql://dev:p%40ss@127.0.0.1:5432/foundry?options=-c+search_path%3Ddemo"
    )
    assert params["host"] == "127.0.0.1"
    assert params["password"] == "p@ss"
    assert params["database"] == "foundry"
    assert params["startup_params"] == {"options": "-c search_path=demo"}


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://dev:secret@remote.example/db",
        "postgresql://dev:secret@127.0.0.1/db?options=-c+search_path%3Dpublic%3Bdrop",
        "postgresql://dev:secret@127.0.0.1/db?options=anything",
        "postgresql://dev:secret@127.0.0.1/db?unexpected=1",
        "postgresql://dev:secret@127.0.0.1/db#fragment",
        "postgresql://dev:secret@127.0.0.1/",
    ],
)
def test_local_worker_rejects_remote_or_unsafe_connection_options(url):
    with pytest.raises(ValueError) as error:
        local_connection_parameters(url)
    assert "secret" not in str(error.value)
