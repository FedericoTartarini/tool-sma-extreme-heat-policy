from __future__ import annotations

from enum import StrEnum
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, field_validator
from pythermalcomfort.models.sports_heat_stress_risk import Sports

ALLOWED_SPORTS: tuple[str, ...] = tuple(sorted(name for name in dir(Sports) if name.isupper()))


class RiskProfile(StrEnum):
    """Public profile values accepted by the home-risk API."""

    ADULT = "ADULT"
    KIDS = "KIDS"


class RiskRequest(BaseModel):
    """Validated request payload for `/home/risk`."""

    sport: str = Field(min_length=1)
    latitude: FiniteFloat = Field(ge=-90, le=90)
    longitude: FiniteFloat = Field(ge=-180, le=180)
    profile: RiskProfile

    _allowed_sports: ClassVar[set[str]] = set(ALLOWED_SPORTS)

    @field_validator("sport")
    @classmethod
    def validate_sport(cls, value: str) -> str:
        """Require the exact pythermalcomfort `Sports` enum member name."""

        if value not in cls._allowed_sports:
            raise ValueError("sport must use official pythermalcomfort Sports enum name")
        return value


class LocationSummary(BaseModel):
    """Resolved location context for the forecast response."""

    latitude: FiniteFloat = Field(ge=-90, le=90)
    longitude: FiniteFloat = Field(ge=-180, le=180)
    timezone: str = Field(min_length=1)


class RequestSummary(BaseModel):
    """Shared request context returned with the forecast response."""

    sport: str = Field(min_length=1)
    profile: RiskProfile
    location: LocationSummary


class ForecastInputs(BaseModel):
    """Public weather and MRT inputs used for one forecast point."""

    air_temperature_c: FiniteFloat
    mean_radiant_temperature_c: FiniteFloat
    relative_humidity_pct: FiniteFloat
    wind_speed_10m_ms: FiniteFloat
    wind_speed_effective_ms: FiniteFloat
    direct_normal_irradiance_wm2: FiniteFloat


class ForecastHeatRisk(BaseModel):
    """pythermalcomfort heat-risk output for one forecast point."""

    model_config = ConfigDict(extra="allow")

    risk_level_interpolated: FiniteFloat
    t_medium: FiniteFloat
    t_high: FiniteFloat
    t_extreme: FiniteFloat
    recommendation: str = Field(min_length=1)


class ForecastPoint(BaseModel):
    """One forecast point with UTC time, explicit inputs, and calculated risk."""

    time_utc: str = Field(min_length=1)
    inputs: ForecastInputs
    heat_risk: ForecastHeatRisk


class RiskResponse(BaseModel):
    """Forecast-centric response contract for `/home/risk`."""

    request: RequestSummary
    forecast: list[ForecastPoint] = Field(min_length=1)
