from __future__ import annotations

import logging
import time
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import cache
from math import isfinite

import pandas as pd
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
)

LOGGER = logging.getLogger(__name__)


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

# MRT columns share their names with the public `inputs` fields, so no mapping is needed.
_REQUIRED_INPUT_FIELDS: tuple[str, ...] = ("tdb", "rh", "v_z1", "sol_radiation_dir", "tr")


class RiskService:
    """Service that orchestrates weather fetch, MRT enrichment, and risk output."""

    def __init__(
        self,
        *,
        weather_client: OpenMeteoClient,
        calculator: SportsHeatStressCalculator,
        ttl_seconds: int,
        max_entries: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        """Store the shared collaborators, TTL and size limit of the in-memory risk cache."""

        self.weather_client = weather_client
        self.calculator = calculator
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._clock = clock
        # Every entry shares one TTL, so insertion order is also expiry order.
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()

    async def calculate_home_risk(self, payload: RiskRequest) -> RiskResponse:
        """Calculate and cache a forecast-centric heat-risk response."""

        key = self._cache_key(payload)
        self._prune_expired()
        cached = self._cache.get(key)

        if cached:
            return cached.value

        timezone_name = resolve_timezone_name(
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        weather = await self.weather_client.fetch_weather_forecast(
            latitude=payload.latitude,
            longitude=payload.longitude,
            timezone_name=timezone_name,
        )
        mrt_df = build_mrt_dataframe(
            points=weather.points,
            latitude=payload.latitude,
            longitude=payload.longitude,
            timezone_name=timezone_name,
        )

        # Profiles already flow through the public contract and cache key, but
        # all supported age groups currently use the same pythermalcomfort model path.
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
            forecast=self._build_forecast(
                forecast_mrt_df=mrt_df, sport=payload.sport, timezone_name=timezone_name
            ),
        )

        self._store(key, response)
        return response

    async def aclose(self) -> None:
        """Close the owned weather client resources."""

        await self.weather_client.aclose()

    def _prune_expired(self) -> None:
        """Drop expired entries, which always sit at the oldest end of the cache."""

        now = self._clock()
        while self._cache and next(iter(self._cache.values())).expires_at <= now:
            self._cache.popitem(last=False)

    def _store(self, key: str, value: RiskResponse) -> None:
        """Insert a response as the newest entry and evict the oldest beyond the size limit."""

        self._prune_expired()
        self._cache.pop(key, None)
        self._cache[key] = CacheEntry(value=value, expires_at=self._clock() + self.ttl_seconds)
        while len(self._cache) > self.max_entries:
            self._cache.popitem(last=False)

    @staticmethod
    def _cache_key(payload: RiskRequest) -> str:
        """Build a stable cache key for the current request contract."""

        return f"{payload.sport}|{payload.profile}|{payload.latitude:.6f}|{payload.longitude:.6f}"

    def _build_forecast(
        self,
        *,
        forecast_mrt_df: pd.DataFrame,
        sport: str,
        timezone_name: str,
    ) -> list[ForecastPoint]:
        """Keep usable MRT rows and warn once about infinite inputs with location context."""

        required_inputs = forecast_mrt_df[list(_REQUIRED_INPUT_FIELDS)]
        unavailable_input_mask = required_inputs.map(_is_unavailable_input)
        infinite_input_mask = unavailable_input_mask & required_inputs.notna()
        has_infinite_inputs = infinite_input_mask.any(axis=1)
        skipped_hours = [
            {
                "time_utc": timestamp.tz_convert(UTC).isoformat(),
                "infinite_inputs": fields.index[fields].tolist(),
            }
            for timestamp, fields in infinite_input_mask.loc[has_infinite_inputs].iterrows()
        ]
        if skipped_hours:
            LOGGER.warning(
                "Skipping forecast hours with infinite required inputs in %s: %s",
                timezone_name,
                "; ".join(
                    f"{hour['time_utc']}: {', '.join(hour['infinite_inputs'])}"
                    for hour in skipped_hours
                ),
                extra={"timezone": timezone_name, "skipped_hours": skipped_hours},
            )

        complete_rows = forecast_mrt_df.loc[~unavailable_input_mask.any(axis=1)]
        if complete_rows.empty:
            # The earliest candidate explains why no usable forecast point remains.
            first_candidate_point = self._first_candidate_forecast_point(
                forecast_mrt_df=forecast_mrt_df
            )
            raise self._unavailable_input_error_for_point(point=first_candidate_point)

        forecast: list[ForecastPoint] = []
        for timestamp, point in complete_rows.iterrows():
            inputs = ForecastInputs.model_validate(
                {field: point[field] for field in _REQUIRED_INPUT_FIELDS}
            )
            forecast_point = self._to_forecast_point(
                timestamp=timestamp.to_pydatetime(),
                inputs=inputs,
                sport=sport,
            )
            forecast.append(forecast_point)

        return forecast

    @staticmethod
    def _unavailable_required_input_fields(point: pd.Series) -> list[str]:
        """List missing or infinite public input fields for a forecast row."""

        return [field for field in _REQUIRED_INPUT_FIELDS if _is_unavailable_input(point[field])]

    @staticmethod
    def _first_candidate_forecast_point(*, forecast_mrt_df: pd.DataFrame) -> pd.Series:
        """Return the earliest candidate row, used for fallback 422 error details."""

        for _, point in forecast_mrt_df.iterrows():
            return point
        raise WeatherProviderError("No hourly record after MRT enrichment")

    def _unavailable_input_error_for_point(
        self,
        *,
        point: pd.Series,
    ) -> ModelInputUnavailableError:
        """Build the public 422 error for a row with missing or infinite required inputs."""

        return ModelInputUnavailableError(
            unknown_inputs=self._unavailable_required_input_fields(point),
            available_inputs=self._available_inputs_for_point(
                point=point,
            ),
        )

    def _available_inputs_for_point(
        self,
        *,
        point: pd.Series,
    ) -> dict[str, float | None]:
        """Expose the current point inputs using public API field names."""

        v_z1 = _to_optional_float(point.v_z1)
        return {
            "tdb": _to_optional_float(point.tdb),
            "tr": _to_optional_float(point.tr),
            "rh": _to_optional_float(point.rh),
            "v_z1": v_z1,
            "sol_radiation_dir": _to_optional_float(point.sol_radiation_dir),
        }

    def _to_forecast_point(
        self,
        *,
        timestamp: datetime,
        inputs: ForecastInputs,
        sport: str,
    ) -> ForecastPoint:
        """Calculate one forecast point and map it into the public response model."""

        # Convert the provider's 10 m wind speed into the model's required 1.1 m input.
        wind_speed_model_ms = self._resolve_model_wind_speed(vr=inputs.v_z1)
        computed = self.calculator.model_sports_heat_stress(
            SportsHeatStressInput(
                sport=sport,
                tdb=inputs.tdb,
                rh=inputs.rh,
                vr=wind_speed_model_ms,
                tr=inputs.tr,
            )
        )

        return ForecastPoint(
            time_utc=timestamp.astimezone(UTC),
            time_local=timestamp,
            inputs=inputs,
            heat_risk=ForecastHeatRisk.model_validate(computed.data),
        )

    @staticmethod
    def _resolve_model_wind_speed(*, vr: float) -> float:
        """Convert 10 m wind speed to the model's required 1.1 m wind speed."""

        return float(
            scale_wind_speed_log(
                v_z1=vr,
                z2=WIND_SPEED_REFACTOR_CONFIG.model_height_meters,
                z1=WIND_SPEED_REFACTOR_CONFIG.api_height_meters,
                z0=WIND_SPEED_REFACTOR_CONFIG.terrain_roughness_length,
                d=WIND_SPEED_REFACTOR_CONFIG.zero_plane_displacement,
                round_output=True,
            ).v_z2
        )


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
        max_entries=settings.risk_cache_max_entries,
    )


async def shutdown_risk_service() -> None:
    """Close and clear the cached risk service during application shutdown."""

    if get_risk_service.cache_info().currsize == 0:
        return

    service = get_risk_service()
    await service.aclose()
    get_risk_service.cache_clear()


def _is_unavailable_input(value: float | None) -> bool:
    """Treat missing and infinite required inputs as unavailable throughout the service."""

    return value is None or pd.isna(value) or not isfinite(value)


def _to_optional_float(value: float | None) -> float | None:
    """Convert a pandas scalar into a JSON-safe float-or-none value."""

    if _is_unavailable_input(value):
        return None
    return float(value)
