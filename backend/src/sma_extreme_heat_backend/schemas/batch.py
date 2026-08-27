from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import ClassVar

from pydantic import BaseModel, Field, FiniteFloat, field_validator

from sma_extreme_heat_backend.schemas.home import ALLOWED_SPORTS, RiskProfile

BATCH_RISK_LOCATION_MAX = 6


class BatchRiskLocationRequest(BaseModel):
    """One coordinate pair in a batch heat-risk request."""

    latitude: FiniteFloat = Field(ge=-90, le=90)
    longitude: FiniteFloat = Field(ge=-180, le=180)


class BatchRiskRequest(BaseModel):
    """Validated request payload for `/home/risk/batch`."""

    sport: str = Field(min_length=1)
    profile: RiskProfile
    locations: list[BatchRiskLocationRequest] = Field(
        min_length=1,
        max_length=BATCH_RISK_LOCATION_MAX,
    )

    _allowed_sports: ClassVar[set[str]] = set(ALLOWED_SPORTS)

    @field_validator("sport")
    @classmethod
    def validate_sport(cls, value: str) -> str:
        """Require the exact pythermalcomfort `Sports` enum member name."""

        if value not in cls._allowed_sports:
            raise ValueError("sport must use official pythermalcomfort Sports enum name")
        return value


class BatchRiskRequestSummary(BaseModel):
    """Shared request context returned with a batch response."""

    sport: str = Field(min_length=1)
    profile: RiskProfile


class BatchRiskLocationStatus(StrEnum):
    """Per-location outcome for a batch heat-risk response."""

    OK = "ok"
    ERROR = "error"


class BatchRiskLocationResult(BaseModel):
    """Summary heat-risk data for one batch location."""

    latitude: FiniteFloat = Field(ge=-90, le=90)
    longitude: FiniteFloat = Field(ge=-180, le=180)
    timezone: str | None = None
    status: BatchRiskLocationStatus
    current_risk_level_interpolated: FiniteFloat | None = None
    today_max_risk_level_interpolated: FiniteFloat | None = None
    current_time_local: datetime | None = None
    error_code: str | None = None
    detail: str | None = None


class BatchRiskResponse(BaseModel):
    """Batch summary response for the multi-city dashboard."""

    request: BatchRiskRequestSummary
    locations: list[BatchRiskLocationResult]
