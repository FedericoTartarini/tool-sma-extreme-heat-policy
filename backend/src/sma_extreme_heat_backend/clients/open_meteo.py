from __future__ import annotations

import asyncio
import logging
import traceback
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from sma_extreme_heat_backend.core.errors import WeatherProviderError

LOGGER = logging.getLogger(__name__)

_HOURLY_FIELDS: tuple[str, ...] = (
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "direct_normal_irradiance",
)

_EXPECTED_HOURLY_UNITS: dict[str, set[str]] = {
    "temperature_2m": {"\N{DEGREE SIGN}C"},
    "relative_humidity_2m": {"%"},
    "wind_speed_10m": {"m/s"},
    "direct_normal_irradiance": {"W/m²", "W/m^2"},
}

_DEFAULT_RETRY_BACKOFF_SECONDS: tuple[float, ...] = (0.25, 1.0)
_RETRYABLE_STATUS_CODES: set[int] = {408, 429}


@dataclass(frozen=True)
class HourlyWeatherPoint:
    """Normalized hourly weather point parsed from Open-Meteo."""

    time_utc: datetime
    tdb: float | None
    rh: float | None
    wind: float | None
    radiation: float | None


@dataclass(frozen=True)
class WeatherForecast:
    """Normalized hourly weather forecast returned by Open-Meteo."""

    points: list[HourlyWeatherPoint]


def _to_float_or_none(value: Any) -> float | None:
    """Convert provider values to floats while treating invalid values as missing."""

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _resolve_provider_timezone(payload: dict[str, Any]) -> tuple[str, ZoneInfo]:
    """Extract and validate the provider timezone used by hourly timestamps."""

    raw_timezone = payload.get("timezone")
    if not isinstance(raw_timezone, str) or raw_timezone.strip() == "":
        raise WeatherProviderError("Weather provider response was missing timezone")

    try:
        return raw_timezone, ZoneInfo(raw_timezone)
    except ZoneInfoNotFoundError as exc:
        raise WeatherProviderError(
            f"Weather provider response contained invalid timezone '{raw_timezone}'"
        ) from exc


def _validate_provider_timezone(
    *,
    provider_timezone_name: str,
    requested_timezone_name: str,
) -> None:
    """Require the provider to echo back the explicitly requested timezone."""

    if provider_timezone_name != requested_timezone_name:
        raise WeatherProviderError(
            "Weather provider response timezone did not match the requested timezone"
        )


def _to_utc_timestamp_or_none(
    value: Any,
    *,
    provider_time_zone: ZoneInfo,
) -> datetime | None:
    """Parse provider timestamps into UTC datetimes."""

    if not isinstance(value, str):
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        timestamp = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=provider_time_zone).astimezone(UTC)
    return timestamp.astimezone(UTC)


def _validate_hourly_units(payload: dict[str, Any]) -> None:
    """Fail fast when Open-Meteo changes any required hourly unit contract."""

    hourly_units = payload.get("hourly_units")
    if not isinstance(hourly_units, dict):
        raise WeatherProviderError("Weather provider response was missing hourly_units")

    for field, expected_units in _EXPECTED_HOURLY_UNITS.items():
        received = hourly_units.get(field)
        if not isinstance(received, str):
            raise WeatherProviderError(f"Weather provider unit was missing for {field}")
        if received not in expected_units:
            expected_text = ", ".join(sorted(expected_units))
            raise WeatherProviderError(
                f"Unexpected unit for {field}: received '{received}', "
                f"expected one of [{expected_text}]"
            )


def _extract_hourly_series(
    payload: dict[str, Any],
    *,
    requested_timezone_name: str,
) -> tuple[list[datetime], dict[str, list[Any]]]:
    """Return aligned hourly provider series keyed by the requested fields."""

    provider_timezone_name, provider_time_zone = _resolve_provider_timezone(payload)
    _validate_provider_timezone(
        provider_timezone_name=provider_timezone_name,
        requested_timezone_name=requested_timezone_name,
    )
    hourly = payload.get("hourly")
    if not isinstance(hourly, dict):
        raise WeatherProviderError("Weather provider response was missing hourly data")

    raw_time = hourly.get("time")
    if not isinstance(raw_time, list):
        raise WeatherProviderError("Weather provider response was missing hourly.time")

    timestamps = [
        _to_utc_timestamp_or_none(item, provider_time_zone=provider_time_zone) for item in raw_time
    ]
    if any(item is None for item in timestamps):
        raise WeatherProviderError("Weather provider response contained invalid hourly.time values")

    series_data: dict[str, list[Any]] = {}
    for field in _HOURLY_FIELDS:
        values = hourly.get(field)
        if not isinstance(values, list):
            raise WeatherProviderError(f"Weather provider response was missing hourly.{field}")
        if len(values) != len(raw_time):
            raise WeatherProviderError(
                f"Weather provider response length mismatch for hourly.{field}"
            )
        series_data[field] = values

    return timestamps, series_data


def _select_hourly_points(
    payload: dict[str, Any],
    *,
    requested_timezone_name: str,
) -> list[HourlyWeatherPoint]:
    """Keep only the current-to-7-day forecast window and normalize each row."""

    timestamps, series_data = _extract_hourly_series(
        payload,
        requested_timezone_name=requested_timezone_name,
    )
    threshold = datetime.now(tz=UTC) - timedelta(hours=1)
    forecast_window_end = threshold + timedelta(days=7)
    candidate_rows = [
        (idx, timestamp)
        for idx, timestamp in sorted(enumerate(timestamps), key=lambda item: item[1])
        if threshold <= timestamp < forecast_window_end
    ]
    if not candidate_rows:
        raise WeatherProviderError("No hourly record after now-1h")

    return [
        HourlyWeatherPoint(
            time_utc=timestamp,
            tdb=_to_float_or_none(series_data["temperature_2m"][idx]),
            rh=_to_float_or_none(series_data["relative_humidity_2m"][idx]),
            wind=_to_float_or_none(series_data["wind_speed_10m"][idx]),
            radiation=_to_float_or_none(series_data["direct_normal_irradiance"][idx]),
        )
        for idx, timestamp in candidate_rows
    ]


class OpenMeteoClient:
    """Thin HTTP client for the Open-Meteo hourly forecast endpoint."""

    def __init__(
        self,
        *,
        base_url: str,
        timeout_seconds: float,
        client: httpx.AsyncClient | None = None,
        retry_backoff_seconds: tuple[float, ...] = _DEFAULT_RETRY_BACKOFF_SECONDS,
    ) -> None:
        """Create the client around a caller-supplied or owned HTTPX async client."""

        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds
        self._retry_backoff_seconds = retry_backoff_seconds
        self._owns_client = client is None
        self._client = client or self._build_async_client()

    async def fetch_weather_forecast(
        self,
        *,
        latitude: float,
        longitude: float,
        timezone_name: str,
    ) -> WeatherForecast:
        """Fetch and validate the hourly weather forecast needed by the backend."""

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join(_HOURLY_FIELDS),
            "wind_speed_unit": "ms",
            "timezone": timezone_name,
        }

        payload = await self._fetch_weather_payload(params=params)

        _validate_hourly_units(payload)
        points = _select_hourly_points(payload, requested_timezone_name=timezone_name)
        return WeatherForecast(points=points)

    def _build_async_client(self) -> httpx.AsyncClient:
        """Build an owned HTTPX client with the configured Open-Meteo settings."""

        return httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout_seconds,
        )

    async def _fetch_weather_payload(self, *, params: dict[str, float | str]) -> dict[str, Any]:
        """Fetch Open-Meteo JSON with bounded retries for transient upstream failures."""

        max_attempts = len(self._retry_backoff_seconds) + 1
        for attempt in range(1, max_attempts + 1):
            try:
                response = await self._client.get("/forecast", params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if not _is_retryable_status_code(status_code) or attempt == max_attempts:
                    _log_weather_provider_failure(
                        exc=exc,
                        attempt=attempt,
                        max_attempts=max_attempts,
                        status_code=status_code,
                        will_retry=False,
                    )
                    raise WeatherProviderError() from exc

                _log_weather_provider_failure(
                    exc=exc,
                    attempt=attempt,
                    max_attempts=max_attempts,
                    status_code=status_code,
                    will_retry=True,
                )
            except httpx.RequestError as exc:
                if attempt == max_attempts:
                    _log_weather_provider_failure(
                        exc=exc,
                        attempt=attempt,
                        max_attempts=max_attempts,
                        status_code=None,
                        will_retry=False,
                    )
                    raise WeatherProviderError() from exc

                _log_weather_provider_failure(
                    exc=exc,
                    attempt=attempt,
                    max_attempts=max_attempts,
                    status_code=None,
                    will_retry=True,
                )

            await asyncio.sleep(self._retry_backoff_seconds[attempt - 1])

        raise WeatherProviderError()

    async def aclose(self) -> None:
        """Close the owned HTTP client when the application shuts down."""

        if self._owns_client:
            await self._client.aclose()


def _is_retryable_status_code(status_code: int) -> bool:
    """Return whether an upstream HTTP status is likely transient."""

    return status_code in _RETRYABLE_STATUS_CODES or status_code >= 500


def _safe_exception_message(exc: httpx.HTTPError) -> str:
    """Return an exception message without the full Open-Meteo URL/query string."""

    message = str(exc)
    return _redact_exception_request_url(exc=exc, text=message)


def _safe_exception_traceback(exc: httpx.HTTPError) -> str:
    """Return a traceback string without the full Open-Meteo URL/query string."""

    formatted = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    return _redact_exception_request_url(exc=exc, text=formatted)


def _redact_exception_request_url(*, exc: httpx.HTTPError, text: str) -> str:
    """Redact the provider request URL from text derived from an HTTPX exception."""

    request = getattr(exc, "request", None)
    if request is not None:
        return text.replace(str(request.url), "<open-meteo-url-redacted>")
    return text


def _log_weather_provider_failure(
    *,
    exc: httpx.HTTPError,
    attempt: int,
    max_attempts: int,
    status_code: int | None,
    will_retry: bool,
) -> None:
    """Log Open-Meteo failures without leaking precise request coordinates."""

    log_method = LOGGER.warning if will_retry else LOGGER.error
    log_extra: dict[str, Any] = {
        "attempt": attempt,
        "max_attempts": max_attempts,
        "exception_type": type(exc).__name__,
        "exception_message": _safe_exception_message(exc),
        "status_code": status_code,
        "will_retry": will_retry,
    }
    if not will_retry:
        log_extra["exception_traceback"] = _safe_exception_traceback(exc)

    log_method(
        "Open-Meteo request failed",
        extra=log_extra,
    )
