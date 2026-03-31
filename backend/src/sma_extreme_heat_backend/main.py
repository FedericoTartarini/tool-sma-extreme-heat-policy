from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sma_extreme_heat_backend.api.routes import router
from sma_extreme_heat_backend.core.config import get_settings
from sma_extreme_heat_backend.core.errors import AppError
from sma_extreme_heat_backend.services.risk_service import shutdown_risk_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Release shared service resources when the FastAPI app shuts down."""

    yield
    await shutdown_risk_service()


def create_app() -> FastAPI:
    """Create the configured FastAPI application instance."""

    settings = get_settings()

    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        """Map typed application errors into stable JSON responses."""

        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    app.include_router(router)

    return app


app = create_app()


def main() -> None:
    """Run the backend in local development mode."""

    import uvicorn

    uvicorn.run("sma_extreme_heat_backend.main:app", host="127.0.0.1", port=8000, reload=True)
