from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import cache

import pandas as pd
from pythermalcomfort.models.sports_heat_stress_risk import Sports
from pythermalcomfort.utils.scale_wind_speed_log import scale_wind_speed_log

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    PythermalcomfortSportsHeatStressCalculator,
    SportsHeatStressCalculator,
    SportsHeatStressInput,
)
from sma_extreme_heat_backend.clients.open_meteo import OpenMeteoClient
from sma_extreme_heat_backend.core.config import get_settings
from sma_extreme_heat_backend.core.errors import (
    ModelInputUnavailableError,
    WeatherProviderError,
)
from sma_extreme_heat_backend.schemas.home import (
    ForecastHeatRisk,
    ForecastInputs,
    ForecastPoint,
    LocationSummary,
    RequestSummary,
    RiskRequest,
    RiskResponse,
)
from sma_extreme_heat_backend.services.mrt import (
    build_mrt_dataframe,
    resolve_timezone_name,
    select_hourly_forecast_rows,
)


@dataclass
class CacheEntry:
    """In-memory TTL cache entry for a computed risk response."""

    value: RiskResponse
    expires_at: float


@dataclass(frozen=True)
class WindSpeedRefactorConfig:
    """Inputs required to convert provider wind speed to model wind speed."""

    api_height_meters: float = 10.0
    model_height_meters: float = 1.1
    terrain_roughness_length: float = 0.01
    zero_plane_displacement: float = 0.0


WIND_SPEED_REFACTOR_CONFIG = WindSpeedRefactorConfig()

_PUBLIC_INPUT_FIELD_BY_COLUMN: dict[str, str] = {
    "tdb": "air_temperature_c",
    "tr": "mean_radiant_temperature_c",
    "rh": "relative_humidity_pct",
    "wind": "wind_speed_10m_ms",
    "radiation": "direct_normal_irradiance_wm2",
}


class RiskService:
    """Service that orchestrates weather fetch, MRT enrichment, and risk output."""

    def __init__(
        self,
        *,
        weather_client: OpenMeteoClient,
        calculator: SportsHeatStressCalculator,
        ttl_seconds: int,
    ) -> None:
        """Store the shared collaborators and TTL used by the in-memory risk cache."""

        self.weather_client = weather_client
        self.calculator = calculator
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, CacheEntry] = {}

    async def calculate_home_risk(self, payload: RiskRequest) -> RiskResponse:
        """Calculate and cache a forecast-centric heat-risk response."""

        key = self._cache_key(payload)
        now = time.monotonic()
        cached = self._cache.get(key)

        if cached and cached.expires_at > now:
            return cached.value

        weather = await self.weather_client.fetch_weather_forecast(
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        timezone_name = resolve_timezone_name(
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        mrt_df = build_mrt_dataframe(
            points=weather.points,
            latitude=payload.latitude,
            longitude=payload.longitude,
            timezone_name=timezone_name,
        )
        hourly_mrt_df = select_hourly_forecast_rows(mrt_df)
        if hourly_mrt_df.empty:
            raise WeatherProviderError("No hourly record after 30-minute resample")

        # `ADULT` and `KIDS` already flow through the public contract and cache key,
        # but both profiles currently use the same pythermalcomfort model path.
        response = RiskResponse(
            request=RequestSummary(
                sport=payload.sport,
                profile=payload.profile,
                location=LocationSummary(
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    timezone=timezone_name,
                ),
            ),
            forecast=self._build_forecast(hourly_mrt_df=hourly_mrt_df, sport=payload.sport),
        )

        self._cache[key] = CacheEntry(value=response, expires_at=now + self.ttl_seconds)
        return response

    async def aclose(self) -> None:
        """Close the owned weather client resources."""

        await self.weather_client.aclose()

    @staticmethod
    def _cache_key(payload: RiskRequest) -> str:
        """Build a stable cache key for the current request contract."""

        return f"{payload.sport}|{payload.profile}|{payload.latitude:.6f}|{payload.longitude:.6f}"

    def _build_forecast(
        self,
        *,
        hourly_mrt_df: pd.DataFrame,
        sport: str,
    ) -> list[ForecastPoint]:
        """Convert MRT rows into forecast points, using the earliest complete row as current."""

        first_candidate_point = self._first_candidate_forecast_point(hourly_mrt_df=hourly_mrt_df)
        forecast: list[ForecastPoint] = []
        for timestamp, point in hourly_mrt_df.iterrows():
            missing_inputs = self._missing_required_input_fields(point)
            if missing_inputs:
                # Skip incomplete leading/future rows so `forecast[0]` is always the earliest
                # complete point that the frontend can safely treat as "current".
                continue

            forecast_point = self._to_forecast_point(
                timestamp=timestamp.to_pydatetime(),
                point=point,
                sport=sport,
            )
            if not forecast:
                # The first appended point becomes the canonical current reading for the UI.
                forecast.append(forecast_point)
                continue

            forecast.append(forecast_point)

        if forecast:
            return forecast

        # Only return 422 when every candidate row is incomplete; the earliest row explains why
        # the backend could not produce any usable current/forecast point.
        raise self._missing_input_error_for_point(
            point=first_candidate_point,
            sport=sport,
        )

    @staticmethod
    def _missing_required_input_fields(point: pd.Series) -> list[str]:
        """List missing public input fields for a forecast row."""

        missing_inputs: list[str] = []
        if pd.isna(point.tdb):
            missing_inputs.append(_PUBLIC_INPUT_FIELD_BY_COLUMN["tdb"])
        if pd.isna(point.rh):
            missing_inputs.append(_PUBLIC_INPUT_FIELD_BY_COLUMN["rh"])
        if pd.isna(point.wind):
            missing_inputs.append(_PUBLIC_INPUT_FIELD_BY_COLUMN["wind"])
        if pd.isna(point.radiation):
            missing_inputs.append(_PUBLIC_INPUT_FIELD_BY_COLUMN["radiation"])
        if pd.isna(point.tr):
            missing_inputs.append(_PUBLIC_INPUT_FIELD_BY_COLUMN["tr"])
        return missing_inputs

    @staticmethod
    def _first_candidate_forecast_point(*, hourly_mrt_df: pd.DataFrame) -> pd.Series:
        """Return the earliest candidate row, used for fallback 422 error details."""

        for _, point in hourly_mrt_df.iterrows():
            return point
        raise WeatherProviderError("No hourly record after 30-minute resample")

    def _missing_input_error_for_point(
        self,
        *,
        point: pd.Series,
        sport: str,
    ) -> ModelInputUnavailableError:
        """Build the public 422 error for a candidate row with missing required inputs."""

        return ModelInputUnavailableError(
            unknown_inputs=self._missing_required_input_fields(point),
            available_inputs=self._available_inputs_for_point(
                point=point,
                sport=sport,
            ),
        )

    def _available_inputs_for_point(
        self,
        *,
        point: pd.Series,
        sport: str,
    ) -> dict[str, float | None]:
        """Expose the current point inputs using public API field names."""

        wind_speed_10m_ms = _to_optional_float(point.wind)
        wind_speed_effective_ms = (
            self._resolve_model_wind_speed(vr=wind_speed_10m_ms, sport=sport)
            if wind_speed_10m_ms is not None
            else None
        )
        return {
            "air_temperature_c": _to_optional_float(point.tdb),
            "mean_radiant_temperature_c": _to_optional_float(point.tr),
            "relative_humidity_pct": _to_optional_float(point.rh),
            "wind_speed_10m_ms": wind_speed_10m_ms,
            "wind_speed_effective_ms": wind_speed_effective_ms,
            "direct_normal_irradiance_wm2": _to_optional_float(point.radiation),
        }

    def _to_forecast_point(
        self,
        *,
        timestamp: datetime,
        point: pd.Series,
        sport: str,
    ) -> ForecastPoint:
        """Calculate one forecast point and map it into the public response model."""

        assert not pd.isna(point.tdb)
        assert not pd.isna(point.rh)
        assert not pd.isna(point.wind)
        assert not pd.isna(point.radiation)
        assert not pd.isna(point.tr)

        wind_speed_10m_ms = float(point.wind)
        # Convert the provider's 10 m wind speed into the model's required 1.1 m input.
        wind_speed_effective_ms = self._resolve_model_wind_speed(
            vr=wind_speed_10m_ms,
            sport=sport,
        )
        computed = self.calculator.model_sports_heat_stress(
            SportsHeatStressInput(
                sport=sport,
                tdb=float(point.tdb),
                rh=float(point.rh),
                vr=wind_speed_effective_ms,
                tr=float(point.tr),
            )
        )

        return ForecastPoint(
            time_utc=self._to_time_utc(timestamp),
            inputs=ForecastInputs(
                air_temperature_c=float(point.tdb),
                mean_radiant_temperature_c=float(point.tr),
                relative_humidity_pct=float(point.rh),
                wind_speed_10m_ms=wind_speed_10m_ms,
                wind_speed_effective_ms=wind_speed_effective_ms,
                direct_normal_irradiance_wm2=float(point.radiation),
            ),
            heat_risk=ForecastHeatRisk.model_validate(computed.data),
        )

    @staticmethod
    def _to_time_utc(timestamp: datetime) -> str:
        """Serialize a timestamp to the API's UTC ISO-8601 format."""

        return timestamp.astimezone(UTC).isoformat().replace("+00:00", "Z")

    @staticmethod
    def _resolve_model_wind_speed(*, vr: float, sport: str) -> float:
        """Convert 10 m wind speed to the effective model wind speed."""

        scaled_vr = float(
            scale_wind_speed_log(
                v_z1=vr,
                z2=WIND_SPEED_REFACTOR_CONFIG.model_height_meters,
                z1=WIND_SPEED_REFACTOR_CONFIG.api_height_meters,
                z0=WIND_SPEED_REFACTOR_CONFIG.terrain_roughness_length,
                d=WIND_SPEED_REFACTOR_CONFIG.zero_plane_displacement,
                round_output=True,
            ).v_z2
        )
        sport_default_vr = getattr(Sports, sport).vr
        return max(scaled_vr, sport_default_vr)


@cache
def get_risk_service() -> RiskService:
    """Return the cached risk-service singleton used by FastAPI dependencies."""

    settings = get_settings()
    return RiskService(
        weather_client=OpenMeteoClient(
            base_url=settings.open_meteo_base_url,
            timeout_seconds=settings.http_timeout_seconds,
        ),
        calculator=PythermalcomfortSportsHeatStressCalculator(),
        ttl_seconds=settings.risk_cache_ttl_seconds,
    )


async def shutdown_risk_service() -> None:
    """Close and clear the cached risk service during application shutdown."""

    if get_risk_service.cache_info().currsize == 0:
        return

    service = get_risk_service()
    await service.aclose()
    get_risk_service.cache_clear()


def _to_optional_float(value: float | None) -> float | None:
    """Convert a pandas scalar into a JSON-safe float-or-none value."""

    if value is None or pd.isna(value):
        return None
    return float(value)
