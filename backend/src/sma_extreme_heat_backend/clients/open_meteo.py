from __future__ import annotations

import asyncio
import logging
import math
import traceback
from dataclasses import dataclass
from dataclasses import field as dataclass_field
from datetime import UTC, date, datetime, timedelta
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

# Requested for weather details only; never required for hourly risk calculation.
_OPTIONAL_HOURLY_FIELDS: tuple[str, ...] = ("uv_index",)

_DAILY_FIELDS: tuple[str, ...] = (
    "sunrise",
    "sunset",
    "precipitation_probability_max",
    "rain_sum",
)

_EXPECTED_DAILY_UNITS: dict[str, set[str]] = {
    "precipitation_probability_max": {"%"},
    "rain_sum": {"mm"},
}

_EXPECTED_HOURLY_UNITS: dict[str, set[str]] = {
    "temperature_2m": {"\N{DEGREE SIGN}C"},
    "relative_humidity_2m": {"%"},
    "wind_speed_10m": {"m/s"},
    "direct_normal_irradiance": {"W/m²", "W/m^2"},
}

_DEFAULT_RETRY_BACKOFF_SECONDS: tuple[float, ...] = (0.25,)
_RETRYABLE_STATUS_CODES: set[int] = {408, 429}


@dataclass(frozen=True)
class HourlyWeatherPoint:
    """Normalized hourly weather point parsed from Open-Meteo."""

    time_utc: datetime
    tdb: float | None
    rh: float | None
    v_z1: float | None
    dni: float | None


@dataclass(frozen=True)
class CalendarHourlyWeatherPoint:
    """Untrimmed provider-local hourly weather used only for daily weather details."""

    time_local: datetime
    tdb: float | None
    rh: float | None
    v_z1: float | None
    uv_index: float | None


@dataclass(frozen=True)
class ProviderDailyWeather:
    """Normalized Open-Meteo daily row for one location-local calendar day."""

    date_local: date
    sunrise_local: str | None
    sunset_local: str | None
    precipitation_probability_max_pct: float | None
    rain_sum_mm: float | None


@dataclass(frozen=True)
class WeatherForecast:
    """Normalized weather forecast returned by Open-Meteo."""

    points: list[HourlyWeatherPoint]
    calendar_hours: list[CalendarHourlyWeatherPoint] = dataclass_field(default_factory=list)
    daily: list[ProviderDailyWeather] = dataclass_field(default_factory=list)


def _to_float_or_none(value: Any) -> float | None:
    """Convert provider values to floats while treating invalid values as missing."""

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_finite_float_or_none(value: Any) -> float | None:
    """Convert weather-detail values to finite floats, treating anything else as missing."""

    parsed = _to_float_or_none(value)
    return parsed if parsed is not None and math.isfinite(parsed) else None


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


def _validate_daily_units(payload: dict[str, Any]) -> None:
    """Fail fast when Open-Meteo changes any required daily unit contract."""

    daily = payload.get("daily")
    if not isinstance(daily, dict):
        return

    daily_units = payload.get("daily_units")
    if not isinstance(daily_units, dict):
        raise WeatherProviderError("Weather provider response was missing daily_units")

    for field, expected_units in _EXPECTED_DAILY_UNITS.items():
        received = daily_units.get(field)
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


def _extract_optional_hourly_series(
    payload: dict[str, Any],
    field: str,
    *,
    expected_length: int,
) -> list[Any]:
    """Return an optional hourly series, or all-missing values when absent or misaligned."""

    hourly = payload.get("hourly")
    values = hourly.get(field) if isinstance(hourly, dict) else None
    if isinstance(values, list) and len(values) == expected_length:
        return values

    LOGGER.warning("Ignoring missing or misaligned Open-Meteo hourly.%s series", field)
    return [None] * expected_length


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
            v_z1=_to_float_or_none(series_data["wind_speed_10m"][idx]),
            dni=_to_float_or_none(series_data["direct_normal_irradiance"][idx]),
        )
        for idx, timestamp in candidate_rows
    ]


def _to_local_time_label(value: Any, *, expected_date: str) -> str | None:
    """Extract an HH:MM label from an Open-Meteo local timestamp."""

    if not isinstance(value, str) or value.strip() == "":
        return None

    if "T" not in value:
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        timestamp = datetime.fromisoformat(normalized)
        expected = date.fromisoformat(expected_date)
    except ValueError:
        return None

    if timestamp.date() != expected:
        return None

    return timestamp.strftime("%H:%M")


def _select_calendar_hours(
    payload: dict[str, Any],
    *,
    requested_timezone_name: str,
) -> list[CalendarHourlyWeatherPoint]:
    """Normalize every provider hour, untrimmed, in the provider's local time."""

    timestamps, series_data = _extract_hourly_series(
        payload,
        requested_timezone_name=requested_timezone_name,
    )
    _, provider_time_zone = _resolve_provider_timezone(payload)
    uv_index_values = _extract_optional_hourly_series(
        payload,
        "uv_index",
        expected_length=len(timestamps),
    )

    return sorted(
        (
            CalendarHourlyWeatherPoint(
                time_local=timestamp.astimezone(provider_time_zone),
                tdb=_to_finite_float_or_none(series_data["temperature_2m"][idx]),
                rh=_to_finite_float_or_none(series_data["relative_humidity_2m"][idx]),
                v_z1=_to_finite_float_or_none(series_data["wind_speed_10m"][idx]),
                uv_index=_to_finite_float_or_none(uv_index_values[idx]),
            )
            for idx, timestamp in enumerate(timestamps)
        ),
        key=lambda point: point.time_local,
    )


def _select_provider_daily(payload: dict[str, Any]) -> list[ProviderDailyWeather]:
    """Parse aligned Open-Meteo daily rows for the forecast window."""

    daily = payload.get("daily")
    if not isinstance(daily, dict):
        return []

    raw_dates = daily.get("time")
    if not isinstance(raw_dates, list):
        raise WeatherProviderError("Weather provider response was missing daily.time")

    series_data: dict[str, list[Any]] = {}
    for field_name in _DAILY_FIELDS:
        if field_name in {"sunrise", "sunset"}:
            continue
        values = daily.get(field_name)
        if not isinstance(values, list):
            raise WeatherProviderError(f"Weather provider response was missing daily.{field_name}")
        if len(values) != len(raw_dates):
            raise WeatherProviderError(
                f"Weather provider response length mismatch for daily.{field_name}"
            )
        series_data[field_name] = values

    sunrise_values = daily.get("sunrise")
    sunset_values = daily.get("sunset")
    if not isinstance(sunrise_values, list) or not isinstance(sunset_values, list):
        raise WeatherProviderError("Weather provider response was missing daily sunrise/sunset")
    if len(sunrise_values) != len(raw_dates) or len(sunset_values) != len(raw_dates):
        raise WeatherProviderError(
            "Weather provider response length mismatch for daily sunrise/sunset"
        )

    rows: list[ProviderDailyWeather] = []
    for idx, raw_date in enumerate(raw_dates):
        if not isinstance(raw_date, str) or raw_date.strip() == "":
            LOGGER.warning("Ignoring Open-Meteo daily row with invalid time at index %s", idx)
            continue

        try:
            date_local = date.fromisoformat(raw_date)
        except ValueError:
            LOGGER.warning(
                "Ignoring Open-Meteo daily row with invalid date format for %s",
                raw_date,
            )
            continue

        sunrise_local = _to_local_time_label(
            sunrise_values[idx],
            expected_date=raw_date,
        )
        sunset_local = _to_local_time_label(
            sunset_values[idx],
            expected_date=raw_date,
        )
        if sunrise_local is None or sunset_local is None:
            # Daylight is one optional metric; keep the row so the other
            # per-day details still reach the client.
            LOGGER.warning(
                "Omitting invalid Open-Meteo sunrise/sunset for %s",
                raw_date,
            )

        rows.append(
            ProviderDailyWeather(
                date_local=date_local,
                sunrise_local=sunrise_local,
                sunset_local=sunset_local,
                precipitation_probability_max_pct=_to_finite_float_or_none(
                    series_data["precipitation_probability_max"][idx]
                ),
                rain_sum_mm=_to_finite_float_or_none(series_data["rain_sum"][idx]),
            )
        )

    return rows


def _try_select_provider_daily(payload: dict[str, Any]) -> list[ProviderDailyWeather]:
    """Parse daily rows without failing the hourly risk forecast or hourly-derived details."""

    try:
        _validate_daily_units(payload)
        return _select_provider_daily(payload)
    except WeatherProviderError:
        LOGGER.warning(
            "Ignoring invalid Open-Meteo daily weather payload",
            exc_info=True,
        )
        return []


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
            "hourly": ",".join(_HOURLY_FIELDS + _OPTIONAL_HOURLY_FIELDS),
            "daily": ",".join(_DAILY_FIELDS),
            "wind_speed_unit": "ms",
            "timezone": timezone_name,
        }

        payload = await self._fetch_weather_payload(params=params)

        _validate_hourly_units(payload)
        points = _select_hourly_points(payload, requested_timezone_name=timezone_name)
        return WeatherForecast(
            points=points,
            calendar_hours=_select_calendar_hours(payload, requested_timezone_name=timezone_name),
            daily=_try_select_provider_daily(payload),
        )

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
