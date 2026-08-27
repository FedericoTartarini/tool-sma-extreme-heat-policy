from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import cache

import pandas as pd
from pythermalcomfort.utils.scale_wind_speed_log import scale_wind_speed_log

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    PythermalcomfortSportsHeatStressCalculator,
    SportsHeatStressCalculator,
    SportsHeatStressInput,
)
from sma_extreme_heat_backend.clients.open_meteo import (
    LocationWeatherFetchResult,
    OpenMeteoClient,
    WeatherLocationRequest,
)
from sma_extreme_heat_backend.core.config import get_settings
from sma_extreme_heat_backend.core.errors import (
    AppError,
    ModelInputUnavailableError,
    RiskCalculationError,
    WeatherProviderError,
)
from sma_extreme_heat_backend.schemas.batch import (
    BatchRiskLocationRequest,
    BatchRiskLocationResult,
    BatchRiskLocationStatus,
    BatchRiskRequest,
    BatchRiskRequestSummary,
    BatchRiskResponse,
)
from sma_extreme_heat_backend.schemas.home import (
    ForecastHeatRisk,
    ForecastInputs,
    ForecastPoint,
    LocationSummary,
    RequestSummary,
    RiskProfile,
    RiskRequest,
    RiskResponse,
)
from sma_extreme_heat_backend.services.batch_summary import (
    get_today_max_risk_level_interpolated,
)
from sma_extreme_heat_backend.services.mrt import (
    build_mrt_dataframe,
    resolve_timezone_name,
)


@dataclass
class CacheEntry[T]:
    """In-memory TTL cache entry for a computed risk result."""

    value: T
    expires_at: float


@dataclass(frozen=True)
class WindSpeedRefactorConfig:
    """Inputs required to convert provider wind speed to model wind speed."""

    api_height_meters: float = 10.0
    model_height_meters: float = 1.1
    terrain_roughness_length: float = 0.01
    zero_plane_displacement: float = 0.0


WIND_SPEED_REFACTOR_CONFIG = WindSpeedRefactorConfig()
LOGGER = logging.getLogger(__name__)

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
        self._cache: dict[str, CacheEntry[RiskResponse]] = {}
        self._batch_cache: dict[str, CacheEntry[BatchRiskLocationResult]] = {}

    async def calculate_home_risk(self, payload: RiskRequest) -> RiskResponse:
        """Calculate and cache a forecast-centric heat-risk response."""

        key = self._cache_key(payload)
        now = time.monotonic()
        cached = self._cache.get(key)

        if cached and cached.expires_at > now:
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
            forecast=self._build_forecast(forecast_mrt_df=mrt_df, sport=payload.sport),
        )

        self._cache[key] = CacheEntry(value=response, expires_at=now + self.ttl_seconds)
        return response

    async def calculate_home_risk_batch(
        self,
        payload: BatchRiskRequest,
    ) -> BatchRiskResponse:
        """Calculate dashboard summaries for multiple locations in one request."""

        now = time.monotonic()
        results: list[BatchRiskLocationResult | None] = [None] * len(payload.locations)
        miss_indices: list[int] = []

        for index, location in enumerate(payload.locations):
            cached = self._batch_cache.get(
                self._batch_cache_key(
                    sport=payload.sport,
                    profile=payload.profile,
                    latitude=location.latitude,
                    longitude=location.longitude,
                )
            )
            if cached and cached.expires_at > now:
                results[index] = cached.value
                continue
            miss_indices.append(index)

        if miss_indices:
            await self._fill_batch_cache_misses(
                payload=payload,
                miss_indices=miss_indices,
                results=results,
            )

        populated_results: list[BatchRiskLocationResult] = []
        for result in results:
            if result is None:
                raise RuntimeError("Batch location result was not populated")
            populated_results.append(result)

        return BatchRiskResponse(
            request=BatchRiskRequestSummary(
                sport=payload.sport,
                profile=payload.profile,
            ),
            locations=populated_results,
        )

    async def aclose(self) -> None:
        """Close the owned weather client resources."""

        await self.weather_client.aclose()

    async def _fill_batch_cache_misses(
        self,
        *,
        payload: BatchRiskRequest,
        miss_indices: list[int],
        results: list[BatchRiskLocationResult | None],
    ) -> None:
        """Fetch and summarize uncached batch locations, storing successful summaries."""

        miss_locations = [payload.locations[index] for index in miss_indices]
        location_contexts = self._resolve_batch_location_contexts(miss_locations)
        weather_results = await self._fetch_batch_weather(location_contexts)
        now = time.monotonic()

        for index, (location, timezone_name, timezone_error), weather_result in zip(
            miss_indices,
            location_contexts,
            weather_results,
            strict=True,
        ):
            summary = self._summarize_location(
                sport=payload.sport,
                location=location,
                timezone_name=timezone_name,
                timezone_error=timezone_error,
                weather_result=weather_result,
            )
            if summary.status == BatchRiskLocationStatus.OK:
                self._batch_cache[
                    self._batch_cache_key(
                        sport=payload.sport,
                        profile=payload.profile,
                        latitude=location.latitude,
                        longitude=location.longitude,
                    )
                ] = CacheEntry(value=summary, expires_at=now + self.ttl_seconds)
            results[index] = summary

    @staticmethod
    def _cache_key(payload: RiskRequest) -> str:
        """Build a stable cache key for the current request contract."""

        return f"{payload.sport}|{payload.profile}|{payload.latitude:.6f}|{payload.longitude:.6f}"

    @staticmethod
    def _batch_cache_key(
        *,
        sport: str,
        profile: RiskProfile,
        latitude: float,
        longitude: float,
    ) -> str:
        """Build a cache key for a successful dashboard location summary.

        Coordinates use `repr` so values that round identically at six decimals
        still produce independent cache entries.
        """

        return f"batch|{sport}|{profile}|{latitude!r}|{longitude!r}"

    @staticmethod
    def _resolve_batch_location_contexts(
        locations: list[BatchRiskLocationRequest],
    ) -> list[tuple[BatchRiskLocationRequest, str | None, AppError | None]]:
        """Resolve timezone metadata for each batch location."""

        contexts: list[tuple[BatchRiskLocationRequest, str | None, AppError | None]] = []
        for location in locations:
            try:
                timezone_name = resolve_timezone_name(
                    latitude=location.latitude,
                    longitude=location.longitude,
                )
            except AppError as exc:
                contexts.append((location, None, exc))
                continue
            contexts.append((location, timezone_name, None))
        return contexts

    async def _fetch_batch_weather(
        self,
        location_contexts: list[tuple[BatchRiskLocationRequest, str | None, AppError | None]],
    ) -> list[LocationWeatherFetchResult | None]:
        """Fetch weather for all resolvable batch locations in one provider call."""

        fetch_requests: list[WeatherLocationRequest] = []
        fetchable_indices: list[int] = []
        for index, (location, timezone_name, timezone_error) in enumerate(location_contexts):
            if timezone_error is not None or timezone_name is None:
                continue
            fetchable_indices.append(index)
            fetch_requests.append(
                WeatherLocationRequest(
                    latitude=location.latitude,
                    longitude=location.longitude,
                    timezone_name=timezone_name,
                )
            )

        weather_results: list[LocationWeatherFetchResult | None] = [None] * len(location_contexts)
        if not fetch_requests:
            return weather_results

        try:
            fetched = await self.weather_client.fetch_weather_forecast_batch(
                locations=fetch_requests,
            )
        except Exception as exc:
            LOGGER.exception("Unexpected batch weather fetch failure")
            failure = LocationWeatherFetchResult.unexpected_failure(exc)
            for index in fetchable_indices:
                weather_results[index] = failure
            return weather_results

        for index, result in zip(fetchable_indices, fetched, strict=True):
            weather_results[index] = result
        return weather_results

    def _summarize_location(
        self,
        *,
        sport: str,
        location: BatchRiskLocationRequest,
        timezone_name: str | None = None,
        timezone_error: AppError | None = None,
        weather_result: LocationWeatherFetchResult | None = None,
    ) -> BatchRiskLocationResult:
        """Summarize one location, mapping failures to per-location error results."""

        try:
            if timezone_error is not None:
                raise timezone_error
            if timezone_name is None:
                raise WeatherProviderError("Could not resolve location timezone from coordinates")
            if weather_result is None:
                raise WeatherProviderError()
            if weather_result.unexpected_error is not None:
                raise weather_result.unexpected_error
            if weather_result.error is not None:
                raise weather_result.error
            if weather_result.forecast is None:
                raise WeatherProviderError()

            mrt_df = build_mrt_dataframe(
                points=weather_result.forecast.points,
                latitude=location.latitude,
                longitude=location.longitude,
                timezone_name=timezone_name,
            )
            forecast = self._build_forecast(forecast_mrt_df=mrt_df, sport=sport)
            current_point = forecast[0]
            return BatchRiskLocationResult(
                latitude=location.latitude,
                longitude=location.longitude,
                timezone=timezone_name,
                status=BatchRiskLocationStatus.OK,
                current_risk_level_interpolated=current_point.heat_risk.risk_level_interpolated,
                today_max_risk_level_interpolated=get_today_max_risk_level_interpolated(forecast),
                current_time_local=current_point.time_local,
                error_code=None,
                detail=None,
            )
        except AppError as exc:
            error_code, detail = _map_batch_location_error(exc)
            return BatchRiskLocationResult(
                latitude=location.latitude,
                longitude=location.longitude,
                timezone=timezone_name,
                status=BatchRiskLocationStatus.ERROR,
                current_risk_level_interpolated=None,
                today_max_risk_level_interpolated=None,
                current_time_local=None,
                error_code=error_code,
                detail=detail,
            )
        except Exception:
            LOGGER.exception(
                "Unexpected batch location failure latitude=%s longitude=%s sport=%s",
                location.latitude,
                location.longitude,
                sport,
            )
            return BatchRiskLocationResult(
                latitude=location.latitude,
                longitude=location.longitude,
                timezone=timezone_name,
                status=BatchRiskLocationStatus.ERROR,
                current_risk_level_interpolated=None,
                today_max_risk_level_interpolated=None,
                current_time_local=None,
                error_code="risk_calculation_failed",
                detail="Risk calculation failed",
            )

    def _build_forecast(
        self,
        *,
        forecast_mrt_df: pd.DataFrame,
        sport: str,
    ) -> list[ForecastPoint]:
        """Convert MRT rows into forecast points, using the earliest complete row as current."""

        first_candidate_point = self._first_candidate_forecast_point(
            forecast_mrt_df=forecast_mrt_df
        )
        forecast: list[ForecastPoint] = []
        for timestamp, point in forecast_mrt_df.iterrows():
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
            forecast.append(forecast_point)

        if forecast:
            return forecast

        # Only return 422 when every candidate row is incomplete; the earliest row explains why
        # the backend could not produce any usable current/forecast point.
        raise self._missing_input_error_for_point(
            point=first_candidate_point,
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
    def _first_candidate_forecast_point(*, forecast_mrt_df: pd.DataFrame) -> pd.Series:
        """Return the earliest candidate row, used for fallback 422 error details."""

        for _, point in forecast_mrt_df.iterrows():
            return point
        raise WeatherProviderError("No hourly record after MRT enrichment")

    def _missing_input_error_for_point(
        self,
        *,
        point: pd.Series,
    ) -> ModelInputUnavailableError:
        """Build the public 422 error for a candidate row with missing required inputs."""

        return ModelInputUnavailableError(
            unknown_inputs=self._missing_required_input_fields(point),
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

        wind_speed_10m_ms = _to_optional_float(point.wind)
        return {
            "air_temperature_c": _to_optional_float(point.tdb),
            "mean_radiant_temperature_c": _to_optional_float(point.tr),
            "relative_humidity_pct": _to_optional_float(point.rh),
            "wind_speed_10m_ms": wind_speed_10m_ms,
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
        wind_speed_model_ms = self._resolve_model_wind_speed(vr=wind_speed_10m_ms)
        computed = self.calculator.model_sports_heat_stress(
            SportsHeatStressInput(
                sport=sport,
                tdb=float(point.tdb),
                rh=float(point.rh),
                vr=wind_speed_model_ms,
                tr=float(point.tr),
            )
        )

        return ForecastPoint(
            time_utc=timestamp.astimezone(UTC),
            time_local=timestamp,
            inputs=ForecastInputs(
                air_temperature_c=float(point.tdb),
                mean_radiant_temperature_c=float(point.tr),
                relative_humidity_pct=float(point.rh),
                wind_speed_10m_ms=wind_speed_10m_ms,
                direct_normal_irradiance_wm2=float(point.radiation),
            ),
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


def _map_batch_location_error(exc: AppError) -> tuple[str, str]:
    """Map a single-location failure into stable batch error fields."""

    if isinstance(exc, WeatherProviderError):
        return "weather_provider_unavailable", _app_error_detail_message(exc)
    if isinstance(exc, ModelInputUnavailableError):
        return "unknown_inputs", _app_error_detail_message(exc)
    if isinstance(exc, RiskCalculationError):
        return "risk_calculation_failed", _app_error_detail_message(exc)
    if exc.error_code is not None:
        return exc.error_code, _app_error_detail_message(exc)
    return "risk_calculation_failed", _app_error_detail_message(exc)


def _app_error_detail_message(exc: AppError) -> str:
    """Serialize an application error detail into a response-safe string."""

    detail = exc.detail
    if isinstance(detail, str):
        return detail
    if isinstance(detail, dict):
        message = detail.get("message")
        if isinstance(message, str) and message.strip():
            return message
    return str(detail)
