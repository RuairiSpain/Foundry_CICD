import asyncio
import logging

import httpx
from foundry_control_plane.app import create_app


def get(app, path: str) -> httpx.Response:
    async def request() -> httpx.Response:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.get(path)

    return asyncio.run(request())


def test_liveness_does_not_claim_readiness_without_dependencies() -> None:
    app = create_app()
    assert get(app, "/health/live").json() == {"status": "ok"}
    response = get(app, "/health/ready")
    assert response.status_code == 503
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["code"] == "service_unavailable"


def test_readiness_reports_success_only_after_the_check_succeeds() -> None:
    async def ready() -> bool:
        return True

    response = get(create_app(ready), "/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_fails_closed_without_leaking_dependency_details(caplog) -> None:
    async def unavailable() -> bool:
        raise RuntimeError("sensitive provider details")

    with caplog.at_level(logging.ERROR):
        response = get(create_app(unavailable), "/health/ready")
    assert response.status_code == 503
    assert "sensitive provider details" not in response.text
    assert "sensitive provider details" not in caplog.text
    assert "readiness check failed" in caplog.text


def test_openapi_documents_the_readiness_problem_response() -> None:
    document = get(create_app(), "/openapi.json").json()
    assert document["openapi"].startswith("3.1.")
    response = document["paths"]["/health/ready"]["get"]["responses"]["503"]
    schema = response["content"]["application/problem+json"]["schema"]
    assert {"type", "title", "status", "detail", "code"}.issubset(schema["properties"])
    assert response["content"].get("application/json") is None
