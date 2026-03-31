from __future__ import annotations

from functools import cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "SMA Extreme Heat Backend"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"],
        alias="CORS_ORIGINS",
    )
    open_meteo_base_url: str = Field(
        default="https://api.open-meteo.com/v1",
        alias="OPEN_METEO_BASE_URL",
    )
    http_timeout_seconds: float = Field(default=10.0, alias="HTTP_TIMEOUT_SECONDS")
    risk_cache_ttl_seconds: int = Field(default=600, alias="RISK_CACHE_TTL_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        """Allow comma-separated CORS origins in the environment."""

        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@cache
def get_settings() -> Settings:
    """Return the cached application settings singleton."""

    return Settings()
