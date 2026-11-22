import logging
from collections.abc import Awaitable, Callable

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
ReadinessCheck = Callable[[], Awaitable[bool]]


class ReadinessProblem(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    code: str


async def not_configured() -> bool:
    return False


def create_app(readiness: ReadinessCheck | None = None) -> FastAPI:
    app = FastAPI(title="Foundry control plane", version="0.1.0")
    check = readiness or not_configured

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get(
        "/health/ready",
        response_model=None,
        responses={
            503: {
                "description": "Required dependencies are not ready.",
                "content": {
                    "application/problem+json": {
                        "schema": ReadinessProblem.model_json_schema()
                    }
                },
            }
        },
    )
    async def ready() -> JSONResponse:
        try:
            available = await check()
        except Exception:  # noqa: BLE001 - normalize dependency failures without logging secrets.
            logger.error("readiness check failed")
            available = False
        if available:
            return JSONResponse({"status": "ready"})
        return JSONResponse(
            status_code=503,
            media_type="application/problem+json",
            content=ReadinessProblem(
                type="about:blank",
                title="Service unavailable",
                status=503,
                detail="Required dependencies are not ready.",
                code="service_unavailable",
            ).model_dump(),
        )

    return app


app = create_app()
