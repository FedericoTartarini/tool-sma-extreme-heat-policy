from __future__ import annotations

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
import pytest

from sma_extreme_heat_backend.clients.open_meteo import OpenMeteoClient
from sma_extreme_heat_backend.core.errors import WeatherProviderError


def _hourly_time_strings(times: list[datetime], *, timezone_name: str = "UTC") -> list[str]:
    """Render timestamps using the provider timezone contract."""

    provider_time_zone = ZoneInfo(timezone_name)
    normalized: list[str] = []
    for ts in times:
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC)
        else:
            ts = ts.astimezone(UTC)
        normalized.append(ts.astimezone(provider_time_zone).strftime("%Y-%m-%dT%H:%M"))
    return normalized


def _hourly_payload(
    *,
    times: list[datetime],
    tdb: list[float | None],
    rh: list[float | None],
    wind: list[float | None],
    radiation: list[float | None],
    timezone_name: str = "UTC",
    units_override: dict[str, str] | None = None,
) -> dict:
    """Build a minimal Open-Meteo hourly payload for tests."""

    units = {
        "temperature_2m": "°C",
        "relative_humidity_2m": "%",
        "wind_speed_10m": "m/s",
        "direct_normal_irradiance": "W/m²",
    }
    if units_override:
        units.update(units_override)

    return {
        "timezone": timezone_name,
        "hourly_units": units,
        "hourly": {
            "time": _hourly_time_strings(times, timezone_name=timezone_name),
            "temperature_2m": tdb,
            "relative_humidity_2m": rh,
            "wind_speed_10m": wind,
            "direct_normal_irradiance": radiation,
        },
    }


def _build_client(handler) -> tuple[OpenMeteoClient, httpx.AsyncClient]:
    """Create an `OpenMeteoClient` backed by an HTTPX mock transport."""

    mock_client = httpx.AsyncClient(
        base_url="https://api.open-meteo.com/v1",
        transport=httpx.MockTransport(handler),
    )
    client = OpenMeteoClient(
        base_url="https://api.open-meteo.com/v1",
        timeout_seconds=10.0,
        client=mock_client,
        retry_backoff_seconds=(0.0, 0.0),
    )
    return client, mock_client


async def test_fetch_weather_forecast_retries_connect_error_then_returns_points() -> None:
    """Transient request failures should be retried before surfacing a provider error."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
    )
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise httpx.ConnectError("Open-Meteo connection failed", request=request)
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    weather = await client.fetch_weather_forecast(
        latitude=-33.847,
        longitude=151.067,
        timezone_name="UTC",
    )
    await mock_client.aclose()

    assert calls == 2
    assert [point.time_utc for point in weather.points] == [now]


async def test_fetch_weather_forecast_keeps_owned_client_open_after_request_error() -> None:
    """Owned clients should not be closed and rebuilt during request-error retries."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
    )
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise httpx.ConnectError("Open-Meteo connection failed", request=request)
        return httpx.Response(status_code=200, json=payload)

    owned_client = httpx.AsyncClient(
        base_url="https://api.open-meteo.com/v1",
        transport=httpx.MockTransport(handler),
    )
    client = OpenMeteoClient(
        base_url="https://api.open-meteo.com/v1",
        timeout_seconds=10.0,
        retry_backoff_seconds=(0.0, 0.0),
    )
    await client._client.aclose()
    client._client = owned_client

    try:
        weather = await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )

        assert calls == 2
        assert client._client is owned_client
        assert not owned_client.is_closed
        assert [point.time_utc for point in weather.points] == [now]
    finally:
        await client.aclose()

    assert owned_client.is_closed


async def test_fetch_weather_forecast_retries_http_500_then_returns_points() -> None:
    """Transient upstream server errors should be retried."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
    )
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(status_code=500)
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    weather = await client.fetch_weather_forecast(
        latitude=-33.847,
        longitude=151.067,
        timezone_name="UTC",
    )
    await mock_client.aclose()

    assert calls == 2
    assert [point.time_utc for point in weather.points] == [now]


async def test_fetch_weather_forecast_raises_after_retryable_http_429_attempts() -> None:
    """Retryable upstream statuses should eventually surface the stable provider error."""

    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(status_code=429)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert exc.detail == "Weather provider unavailable"
    else:
        raise AssertionError("Expected WeatherProviderError after retryable 429 attempts")
    finally:
        await mock_client.aclose()

    assert calls == 3


async def test_fetch_weather_forecast_does_not_retry_http_400() -> None:
    """Non-retryable upstream client errors should fail after the first attempt."""

    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(status_code=400)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert exc.detail == "Weather provider unavailable"
    else:
        raise AssertionError("Expected WeatherProviderError for non-retryable 400")
    finally:
        await mock_client.aclose()

    assert calls == 1


async def test_fetch_weather_forecast_returns_hourly_points_from_now_minus_1h() -> None:
    """The forecast should keep rows from now minus one hour onward."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[
            now - timedelta(hours=2),
            now,
            now + timedelta(hours=1),
            now + timedelta(hours=2),
        ],
        tdb=[19.0, 31.0, 33.0, 34.0],
        rh=[80.0, 62.0, 61.0, 60.0],
        wind=[0.9, 1.5, 1.1, 1.0],
        radiation=[0.0, 720.0, 760.0, 780.0],
        timezone_name="UTC",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["hourly"] == (
            "temperature_2m,relative_humidity_2m,wind_speed_10m,direct_normal_irradiance"
        )
        assert request.url.params["wind_speed_unit"] == "ms"
        assert request.url.params["timezone"] == "UTC"
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    weather = await client.fetch_weather_forecast(
        latitude=-33.847,
        longitude=151.067,
        timezone_name="UTC",
    )
    await mock_client.aclose()

    assert [point.time_utc for point in weather.points] == [
        now,
        now + timedelta(hours=1),
        now + timedelta(hours=2),
    ]
    assert [point.tdb for point in weather.points] == [31.0, 33.0, 34.0]
    assert [point.rh for point in weather.points] == [62.0, 61.0, 60.0]
    assert [point.wind for point in weather.points] == [1.5, 1.1, 1.0]
    assert [point.radiation for point in weather.points] == [720.0, 760.0, 780.0]


@pytest.mark.parametrize(
    ("timezone_name", "utc_minute"),
    [
        ("Australia/Adelaide", 30),
        ("Australia/Eucla", 15),
        ("Asia/Kathmandu", 15),
    ],
)
async def test_fetch_weather_forecast_converts_local_hourly_times_back_to_utc(
    timezone_name: str,
    utc_minute: int,
) -> None:
    """Provider-local timestamps should normalize back to UTC instants."""

    now = datetime.now(tz=UTC).replace(minute=utc_minute, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now - timedelta(hours=2), now, now + timedelta(hours=1)],
        tdb=[19.0, 31.0, 33.0],
        rh=[80.0, 62.0, 61.0],
        wind=[0.9, 1.5, 1.1],
        radiation=[0.0, 720.0, 760.0],
        timezone_name=timezone_name,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["timezone"] == timezone_name
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    weather = await client.fetch_weather_forecast(
        latitude=-31.9523,
        longitude=115.8613,
        timezone_name=timezone_name,
    )
    await mock_client.aclose()

    assert [point.time_utc for point in weather.points] == [
        now,
        now + timedelta(hours=1),
    ]
    assert [point.time_utc.minute for point in weather.points] == [utc_minute, utc_minute]


async def test_fetch_weather_forecast_rejects_invalid_temperature_unit() -> None:
    """Unexpected temperature units should fail fast."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
        units_override={"temperature_2m": "°F"},
    )
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert "temperature_2m" in str(exc.detail)
    else:
        raise AssertionError("Expected WeatherProviderError for invalid temperature unit")
    finally:
        await mock_client.aclose()

    assert calls == 1


async def test_fetch_weather_forecast_rejects_invalid_direct_normal_irradiance_unit() -> None:
    """Unexpected radiation units should fail fast."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
        units_override={"direct_normal_irradiance": "kW/m²"},
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert "direct_normal_irradiance" in str(exc.detail)
    else:
        raise AssertionError("Expected WeatherProviderError for invalid radiation unit")
    finally:
        await mock_client.aclose()


async def test_fetch_weather_forecast_rejects_missing_timezone_metadata() -> None:
    """Responses without timezone metadata should be rejected."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
    )
    payload.pop("timezone")

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert exc.detail == "Weather provider response was missing timezone"
    else:
        raise AssertionError("Expected WeatherProviderError for missing timezone metadata")
    finally:
        await mock_client.aclose()


async def test_fetch_weather_forecast_rejects_invalid_timezone_metadata() -> None:
    """Invalid timezone names should be rejected."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
    )
    payload["timezone"] = "Mars/Olympus"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert "invalid timezone" in str(exc.detail)
    else:
        raise AssertionError("Expected WeatherProviderError for invalid timezone metadata")
    finally:
        await mock_client.aclose()


async def test_fetch_weather_forecast_rejects_provider_timezone_mismatch() -> None:
    """Provider timezone metadata must match the explicitly requested timezone."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now],
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        radiation=[720.0],
        timezone_name="Australia/Perth",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="Australia/Sydney",
        )
    except WeatherProviderError as exc:
        assert (
            exc.detail
            == "Weather provider response timezone did not match the requested timezone"
        )
    else:
        raise AssertionError("Expected WeatherProviderError for timezone mismatch")
    finally:
        await mock_client.aclose()


async def test_fetch_weather_forecast_raises_when_no_hourly_record_after_now_minus_1h() -> None:
    """Responses outside the allowed forecast window should fail."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now - timedelta(hours=4), now - timedelta(hours=3)],
        tdb=[20.0, 21.0],
        rh=[70.0, 69.0],
        wind=[1.0, 1.2],
        radiation=[0.0, 0.0],
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert exc.detail == "No hourly record after now-1h"
    else:
        raise AssertionError(
            "Expected WeatherProviderError when no hourly record matches now-1h rule"
        )
    finally:
        await mock_client.aclose()


async def test_fetch_weather_forecast_rejects_invalid_hourly_time_value() -> None:
    """Malformed hourly timestamps should fail validation."""

    payload = {
        "timezone": "UTC",
        "hourly_units": {
            "temperature_2m": "°C",
            "relative_humidity_2m": "%",
            "wind_speed_10m": "m/s",
            "direct_normal_irradiance": "W/m²",
        },
        "hourly": {
            "time": ["invalid-time"],
            "temperature_2m": [31.0],
            "relative_humidity_2m": [62.0],
            "wind_speed_10m": [1.5],
            "direct_normal_irradiance": [720.0],
        },
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert exc.detail == "Weather provider response contained invalid hourly.time values"
    else:
        raise AssertionError("Expected WeatherProviderError for invalid hourly.time values")
    finally:
        await mock_client.aclose()


async def test_fetch_weather_forecast_rejects_length_mismatch_for_direct_normal_irradiance() -> (
    None
):
    """Length mismatches between time and weather series should fail validation."""

    now = datetime.now(tz=UTC).replace(minute=0, second=0, microsecond=0)
    payload = _hourly_payload(
        times=[now, now + timedelta(hours=1)],
        tdb=[31.0, 32.0],
        rh=[62.0, 61.0],
        wind=[1.5, 1.1],
        radiation=[720.0],
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json=payload)

    client, mock_client = _build_client(handler)

    try:
        await client.fetch_weather_forecast(
            latitude=-33.847,
            longitude=151.067,
            timezone_name="UTC",
        )
    except WeatherProviderError as exc:
        assert exc.detail == (
            "Weather provider response length mismatch for hourly.direct_normal_irradiance"
        )
    else:
        raise AssertionError("Expected WeatherProviderError for radiation length mismatch")
    finally:
        await mock_client.aclose()
