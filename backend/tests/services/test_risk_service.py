from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from math import isfinite
from zoneinfo import ZoneInfo

import httpx
import pandas as pd
import pytest

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    SportsHeatStressInput,
    SportsHeatStressOutput,
)
from sma_extreme_heat_backend.clients.open_meteo import (
    HourlyWeatherPoint,
    OpenMeteoClient,
    WeatherForecast,
)
from sma_extreme_heat_backend.core.errors import ModelInputUnavailableError
from sma_extreme_heat_backend.schemas.home import RiskRequest
from sma_extreme_heat_backend.services.risk_service import RiskService

VALID_PROFILES = ("ADULT", "UNDER_10", "AGE_10_13", "AGE_14_17")


class FakeWeatherClient:
    """Test double that returns a deterministic hourly forecast."""

    def __init__(
        self,
        *,
        expected_latitude: float | None = -33.847,
        expected_longitude: float | None = 151.067,
        expected_timezone_name: str | None = "Australia/Sydney",
    ) -> None:
        self.calls = 0
        self.expected_latitude = expected_latitude
        self.expected_longitude = expected_longitude
        self.expected_timezone_name = expected_timezone_name
        base_time = datetime(2026, 3, 9, 0, 0, tzinfo=UTC)
        self.points = [
            HourlyWeatherPoint(
                time_utc=base_time + timedelta(hours=offset),
                tdb=31.0 + offset,
                rh=62.0 + offset,
                v_z1=1.5 + (offset * 0.1),
                dni=700.0 + (offset * 50.0),
            )
            for offset in range(3)
        ]

    async def fetch_weather_forecast(
        self,
        *,
        latitude: float,
        longitude: float,
        timezone_name: str,
    ) -> WeatherForecast:
        """Return the deterministic forecast and track request counts."""

        self.calls += 1
        if self.expected_latitude is not None:
            assert latitude == self.expected_latitude
        if self.expected_longitude is not None:
            assert longitude == self.expected_longitude
        if self.expected_timezone_name is not None:
            assert timezone_name == self.expected_timezone_name
        return WeatherForecast(points=self.points)

    async def aclose(self) -> None:
        """Match the real client shutdown interface."""

        return None


class FakeCalculator:
    """Test double that returns incrementing heat-risk outputs."""

    def __init__(self) -> None:
        self.calls = 0
        self.payloads: list[SportsHeatStressInput] = []

    def model_sports_heat_stress(self, payload: SportsHeatStressInput) -> SportsHeatStressOutput:
        """Return a stable pythermalcomfort-like payload for assertions."""

        self.calls += 1
        self.payloads.append(payload)
        return SportsHeatStressOutput(
            data={
                "risk_level_interpolated": round(1.84 + (self.calls * 0.1), 2),
                "t_medium": 34.5,
                "t_high": 37.1,
                "t_extreme": 39.2,
                "recommendation": "Increase hydration & modify clothing",
            },
            meta={
                "model": "pythermalcomfort.models.sports_heat_stress_risk",
            },
        )


def _build_mrt_dataframe(
    *,
    timezone_name: str = "Australia/Sydney",
    utc_start: str = "2026-03-09T00:00:00Z",
    wind_start: float = 1.5,
    tr_offset: float = 6.25,
    current_missing: set[str] | None = None,
    future_missing_by_row: dict[int, set[str]] | None = None,
) -> pd.DataFrame:
    """Build a deterministic MRT dataframe for service tests."""

    current_missing = current_missing or set()
    future_missing_by_row = future_missing_by_row or {}
    index_utc = pd.date_range(
        start=utc_start,
        periods=3,
        freq="1h",
    )
    index_local = index_utc.tz_convert(timezone_name)
    rows: list[dict[str, float]] = []

    for offset, _ in enumerate(index_local):
        missing_fields = (
            current_missing if offset == 0 else future_missing_by_row.get(offset, set())
        )
        tdb = 31.0 + offset
        row = {
            "tdb": tdb,
            "rh": 62.0 + offset,
            "v_z1": wind_start + (offset * 0.1),
            "dni": 700.0 + (offset * 50.0),
            "elevation": 50.0 + offset,
            "sol_radiation_dir": 525.0 + (offset * 37.5),
            "delta_mrt": tr_offset,
            "tr": tdb + tr_offset,
        }
        for field in missing_fields:
            row[field] = float("nan")
        rows.append(row)

    return pd.DataFrame(rows, index=index_local)


def _install_mrt_pipeline(
    monkeypatch: pytest.MonkeyPatch,
    *,
    df: pd.DataFrame,
    timezone_name: str = "Australia/Sydney",
) -> None:
    """Replace the MRT helpers with deterministic test doubles."""

    monkeypatch.setattr(
        "sma_extreme_heat_backend.services.risk_service.resolve_timezone_name",
        lambda **_: timezone_name,
    )
    monkeypatch.setattr(
        "sma_extreme_heat_backend.services.risk_service.build_mrt_dataframe",
        lambda **_: df.copy(),
    )


async def test_risk_service_passes_expected_inputs_to_calculator(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The calculator should receive the complete expected model input."""

    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())
    service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )

    assert calculator.payloads[0] == SportsHeatStressInput(
        sport="SOCCER",
        tdb=31.0,
        rh=62.0,
        vr=1.02,
        tr=37.25,
    )


async def test_risk_service_uses_ttl_cache_for_same_input(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Repeated requests for the same key should reuse the cached response."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())

    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    payload = RiskRequest(
        sport="SOCCER",
        latitude=-33.847,
        longitude=151.067,
        profile="ADULT",
    )

    first = await service.calculate_home_risk(payload)
    second = await service.calculate_home_risk(payload)

    assert weather_client.calls == 1
    assert calculator.calls == 3
    assert first == second
    assert first.request.model_dump() == {
        "sport": "SOCCER",
        "profile": "ADULT",
        "location": {
            "latitude": -33.847,
            "longitude": 151.067,
            "timezone": "Australia/Sydney",
        },
    }
    assert first.forecast[0].inputs.model_dump() == {
        "tdb": 31.0,
        "tr": 37.25,
        "rh": 62.0,
        "v_z1": 1.5,
        "sol_radiation_dir": 525.0,
    }
    assert first.forecast[0].heat_risk.model_dump() == {
        "risk_level_interpolated": 1.94,
        "t_medium": 34.5,
        "t_high": 37.1,
        "t_extreme": 39.2,
        "recommendation": "Increase hydration & modify clothing",
    }
    assert first.model_dump(mode="json")["forecast"] == [
        {
            "time_utc": "2026-03-09T00:00:00Z",
            "time_local": "2026-03-09T11:00:00+11:00",
            "inputs": {
                "tdb": 31.0,
                "tr": 37.25,
                "rh": 62.0,
                "v_z1": 1.5,
                "sol_radiation_dir": 525.0,
            },
            "heat_risk": {
                "risk_level_interpolated": 1.94,
                "t_medium": 34.5,
                "t_high": 37.1,
                "t_extreme": 39.2,
                "recommendation": "Increase hydration & modify clothing",
            },
        },
        {
            "time_utc": "2026-03-09T01:00:00Z",
            "time_local": "2026-03-09T12:00:00+11:00",
            "inputs": {
                "tdb": 32.0,
                "tr": 38.25,
                "rh": 63.0,
                "v_z1": 1.6,
                "sol_radiation_dir": 562.5,
            },
            "heat_risk": {
                "risk_level_interpolated": 2.04,
                "t_medium": 34.5,
                "t_high": 37.1,
                "t_extreme": 39.2,
                "recommendation": "Increase hydration & modify clothing",
            },
        },
        {
            "time_utc": "2026-03-09T02:00:00Z",
            "time_local": "2026-03-09T13:00:00+11:00",
            "inputs": {
                "tdb": 33.0,
                "tr": 39.25,
                "rh": 64.0,
                "v_z1": 1.7,
                "sol_radiation_dir": 600.0,
            },
            "heat_risk": {
                "risk_level_interpolated": 2.14,
                "t_medium": 34.5,
                "t_high": 37.1,
                "t_extreme": 39.2,
                "recommendation": "Increase hydration & modify clothing",
            },
        },
    ]


class FakeClock:
    """Manually advanced monotonic clock for cache expiry tests."""

    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def _payload_at(latitude: float) -> RiskRequest:
    """Build a request whose cache key differs only by latitude."""

    return RiskRequest(sport="SOCCER", latitude=latitude, longitude=151.067, profile="ADULT")


async def test_risk_service_reuses_cache_within_ttl_and_refetches_after_expiry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A key is a cache hit until its TTL elapses, then it is fetched again."""

    weather_client = FakeWeatherClient(expected_latitude=None)
    clock = FakeClock()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())
    service = RiskService(
        weather_client=weather_client,
        calculator=FakeCalculator(),
        ttl_seconds=600,
        max_entries=1000,
        clock=clock,
    )

    await service.calculate_home_risk(_payload_at(-33.0))
    clock.now = 599.0
    await service.calculate_home_risk(_payload_at(-33.0))
    assert weather_client.calls == 1

    clock.now = 600.0
    await service.calculate_home_risk(_payload_at(-33.0))
    assert weather_client.calls == 2


async def test_risk_service_prunes_expired_entries_for_other_keys(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Expired entries are deleted when any later request touches the cache."""

    clock = FakeClock()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())
    service = RiskService(
        weather_client=FakeWeatherClient(expected_latitude=None),
        calculator=FakeCalculator(),
        ttl_seconds=600,
        max_entries=1000,
        clock=clock,
    )

    await service.calculate_home_risk(_payload_at(-33.0))
    clock.now = 300.0
    await service.calculate_home_risk(_payload_at(-34.0))
    clock.now = 650.0
    await service.calculate_home_risk(_payload_at(-35.0))

    assert list(service._cache) == [
        service._cache_key(_payload_at(-34.0)),
        service._cache_key(_payload_at(-35.0)),
    ]


async def test_risk_service_evicts_oldest_inserted_entry_beyond_max_entries(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The cache never exceeds its size limit and evicts in insertion order."""

    weather_client = FakeWeatherClient(expected_latitude=None)
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())
    service = RiskService(
        weather_client=weather_client,
        calculator=FakeCalculator(),
        ttl_seconds=600,
        max_entries=2,
        clock=FakeClock(),
    )

    for latitude in (-33.0, -34.0, -35.0):
        await service.calculate_home_risk(_payload_at(latitude))
        assert len(service._cache) <= 2

    assert list(service._cache) == [
        service._cache_key(_payload_at(-34.0)),
        service._cache_key(_payload_at(-35.0)),
    ]

    # The evicted oldest key is fetched again, and evicts the next oldest in turn.
    await service.calculate_home_risk(_payload_at(-33.0))
    assert weather_client.calls == 4
    assert list(service._cache) == [
        service._cache_key(_payload_at(-35.0)),
        service._cache_key(_payload_at(-33.0)),
    ]


async def test_risk_service_cache_key_changes_with_coordinates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Coordinate changes should produce independent cache entries."""

    weather_client = FakeWeatherClient(expected_latitude=None, expected_longitude=None)
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )
    await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847001,
            longitude=151.067001,
            profile="ADULT",
        )
    )

    assert weather_client.calls == 2
    assert calculator.calls == 6


async def test_risk_service_returns_local_hourly_times_for_quarter_hour_timezone(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forecast points should expose local hourly labels for quarter-hour timezones."""

    _install_mrt_pipeline(
        monkeypatch,
        df=_build_mrt_dataframe(
            timezone_name="Australia/Eucla",
            utc_start="2026-03-09T00:15:00Z",
        ),
        timezone_name="Australia/Eucla",
    )
    service = RiskService(
        weather_client=FakeWeatherClient(
            expected_latitude=-31.721,
            expected_longitude=128.883,
            expected_timezone_name="Australia/Eucla",
        ),
        calculator=FakeCalculator(),
        ttl_seconds=600,
        max_entries=1000,
    )

    response = await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-31.721,
            longitude=128.883,
            profile="ADULT",
        )
    )

    assert [point.model_dump(mode="json")["time_utc"] for point in response.forecast] == [
        "2026-03-09T00:15:00Z",
        "2026-03-09T01:15:00Z",
        "2026-03-09T02:15:00Z",
    ]
    assert [point.model_dump(mode="json")["time_local"] for point in response.forecast] == [
        "2026-03-09T09:00:00+08:45",
        "2026-03-09T10:00:00+08:45",
        "2026-03-09T11:00:00+08:45",
    ]


@pytest.mark.parametrize(
    ("first_profile", "second_profile"),
    [
        ("ADULT", "UNDER_10"),
        ("AGE_10_13", "AGE_14_17"),
    ],
)
async def test_risk_service_cache_key_changes_with_profile(
    monkeypatch: pytest.MonkeyPatch,
    first_profile: str,
    second_profile: str,
) -> None:
    """Profile changes should produce independent cache entries."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile=first_profile,
        )
    )
    await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile=second_profile,
        )
    )

    assert weather_client.calls == 2
    assert calculator.calls == 6


@pytest.mark.parametrize("profile", VALID_PROFILES)
async def test_risk_service_returns_same_forecast_for_all_profiles(
    monkeypatch: pytest.MonkeyPatch,
    profile: str,
) -> None:
    """All supported profiles currently map to the same pythermalcomfort model path."""

    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())

    adult_service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=FakeCalculator(),
        ttl_seconds=600,
        max_entries=1000,
    )
    comparison_service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=FakeCalculator(),
        ttl_seconds=600,
        max_entries=1000,
    )

    adult = await adult_service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )
    comparison = await comparison_service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile=profile,
        )
    )

    assert adult.request.profile == "ADULT"
    assert comparison.request.profile == profile
    assert [point.model_dump() for point in adult.forecast] == [
        point.model_dump() for point in comparison.forecast
    ]


async def test_risk_service_uses_only_height_scaled_wind_for_lower_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Lower wind speeds should only be scaled to the model height."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe(wind_start=0.9))
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )

    assert calculator.payloads[0].vr == pytest.approx(0.61)


async def test_risk_service_uses_only_height_scaled_wind_for_higher_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Higher wind speeds should still only use the height-scaled value."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe(wind_start=4.0))
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    response = await service.calculate_home_risk(
        RiskRequest(
            sport="RUNNING",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )

    assert calculator.payloads[0].vr == pytest.approx(2.72)
    assert response.forecast[0].inputs.v_z1 == pytest.approx(4.0)


async def test_risk_service_skips_future_points_with_missing_inputs(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Future rows with missing inputs should be skipped instead of failing the request."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(
        monkeypatch,
        df=_build_mrt_dataframe(future_missing_by_row={1: {"v_z1"}}),
    )
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    with caplog.at_level(logging.WARNING, logger="sma_extreme_heat_backend.services.risk_service"):
        response = await service.calculate_home_risk(
            RiskRequest(
                sport="SOCCER",
                latitude=-33.847,
                longitude=151.067,
                profile="ADULT",
            )
        )

    assert calculator.calls == 2
    assert [point.model_dump(mode="json")["time_utc"] for point in response.forecast] == [
        "2026-03-09T00:00:00Z",
        "2026-03-09T02:00:00Z",
    ]
    assert caplog.records == []


async def test_risk_service_skips_incomplete_leading_rows_and_uses_next_complete_point(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Skip missing leading rows without an infinity warning when a usable row remains."""

    caplog.set_level(logging.WARNING, logger="sma_extreme_heat_backend.services.risk_service")
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe(current_missing={"v_z1"}))
    calculator = FakeCalculator()
    service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    response = await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )

    assert calculator.calls == 2
    assert [point.model_dump(mode="json")["time_utc"] for point in response.forecast] == [
        "2026-03-09T01:00:00Z",
        "2026-03-09T02:00:00Z",
    ]
    assert response.forecast[0].inputs.model_dump() == {
        "tdb": 32.0,
        "tr": 38.25,
        "rh": 63.0,
        "v_z1": 1.6,
        "sol_radiation_dir": 562.5,
    }
    assert caplog.records == []


@pytest.mark.parametrize("field", ["tdb", "rh", "v_z1", "sol_radiation_dir", "tr"])
@pytest.mark.parametrize("unavailable_value", [float("nan"), float("inf"), float("-inf")])
async def test_risk_service_raises_422_when_no_complete_forecast_point_exists(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    field: str,
    unavailable_value: float,
) -> None:
    """A 422 should only be returned when every forecast candidate row is incomplete."""

    df = _build_mrt_dataframe()
    df[field] = unavailable_value
    _install_mrt_pipeline(monkeypatch, df=df)
    calculator = FakeCalculator()
    service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    with (
        caplog.at_level(logging.WARNING, logger="sma_extreme_heat_backend.services.risk_service"),
        pytest.raises(ModelInputUnavailableError) as caught,
    ):
        await service.calculate_home_risk(
            RiskRequest(
                sport="SOCCER",
                latitude=-33.847,
                longitude=151.067,
                profile="ADULT",
            )
        )
    expected_inputs = {
        "tdb": 31.0,
        "tr": 37.25,
        "rh": 62.0,
        "v_z1": 1.5,
        "sol_radiation_dir": 525.0,
    }
    expected_inputs[field] = None
    assert caught.value.status_code == 422
    assert caught.value.detail == {
        "message": "Required model inputs are missing or uncertain",
        "unknown_inputs": [field],
        "available_inputs": expected_inputs,
    }
    assert json.loads(json.dumps(caught.value.detail, allow_nan=False)) == caught.value.detail
    assert calculator.calls == 0
    if pd.isna(unavailable_value):
        assert caplog.records == []
    else:
        assert len(caplog.records) == 1
        record = caplog.records[0]
        assert record.levelno == logging.WARNING
        assert record.timezone == "Australia/Sydney"
        assert record.skipped_hours == [
            {"time_utc": timestamp.tz_convert(UTC).isoformat(), "infinite_inputs": [field]}
            for timestamp in df.index
        ]
        message = logging.Formatter("%(message)s").format(record)
        for timestamp in df.index:
            assert f"{timestamp.tz_convert(UTC).isoformat()}: {field}" in message


@pytest.mark.parametrize("field", ["tdb", "rh", "v_z1", "sol_radiation_dir", "tr"])
@pytest.mark.parametrize("infinite_value", [float("inf"), float("-inf")])
@pytest.mark.parametrize("row_index", [0, 2], ids=["leading-hour", "future-hour"])
async def test_risk_service_skips_and_logs_hours_with_infinite_inputs(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    field: str,
    infinite_value: float,
    row_index: int,
) -> None:
    """An infinite input must not hide other hours or reach the calculator."""

    df = _build_mrt_dataframe()
    timestamp = df.index[row_index]
    df.loc[timestamp, field] = infinite_value
    _install_mrt_pipeline(monkeypatch, df=df)
    calculator = FakeCalculator()
    service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )

    with caplog.at_level(logging.WARNING, logger="sma_extreme_heat_backend.services.risk_service"):
        response = await service.calculate_home_risk(
            RiskRequest(sport="SOCCER", latitude=-33.847, longitude=151.067, profile="ADULT")
        )

    assert calculator.calls == 2
    assert [point.time_utc for point in response.forecast] == [
        candidate.to_pydatetime().astimezone(UTC)
        for candidate in df.index
        if candidate != timestamp
    ]
    expected_inputs = [
        {
            "tdb": 31.0 + offset,
            "tr": 37.25 + offset,
            "rh": 62.0 + offset,
            "v_z1": 1.5 + 0.1 * offset,
            "sol_radiation_dir": 525.0 + 37.5 * offset,
        }
        for offset in range(3)
        if offset != row_index
    ]
    assert [point.inputs.model_dump() for point in response.forecast] == expected_inputs
    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.levelno == logging.WARNING
    assert record.timezone == "Australia/Sydney"
    assert record.skipped_hours == [
        {"time_utc": timestamp.tz_convert(UTC).isoformat(), "infinite_inputs": [field]}
    ]
    assert logging.Formatter("%(message)s").format(record) == (
        "Skipping forecast hours with infinite required inputs in Australia/Sydney: "
        f"{timestamp.tz_convert(UTC).isoformat()}: {field}"
    )


@pytest.mark.parametrize(
    "all_unavailable", [False, True], ids=["valid-hour-remains", "no-valid-hour"]
)
async def test_risk_service_handles_mixed_missing_and_infinite_inputs(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    all_unavailable: bool,
) -> None:
    """Summarise corrupt hours once, including hours that also have missing inputs."""

    df = _build_mrt_dataframe(
        current_missing={"rh"},
        future_missing_by_row={1: {"v_z1"}, 2: {"tr"}} if all_unavailable else {},
    )
    df.loc[df.index[0], "tdb"] = float("inf")
    df.loc[df.index[0], "tr"] = float("-inf")
    df.loc[df.index[2], "v_z1"] = float("-inf")
    _install_mrt_pipeline(monkeypatch, df=df)
    calculator = FakeCalculator()
    service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )
    payload = RiskRequest(sport="SOCCER", latitude=-33.847, longitude=151.067, profile="ADULT")

    with caplog.at_level(logging.WARNING, logger="sma_extreme_heat_backend.services.risk_service"):
        if all_unavailable:
            with pytest.raises(ModelInputUnavailableError) as caught:
                await service.calculate_home_risk(payload)
            assert caught.value.status_code == 422
            assert caught.value.detail == {
                "message": "Required model inputs are missing or uncertain",
                "unknown_inputs": ["tdb", "rh", "tr"],
                "available_inputs": {
                    "tdb": None,
                    "rh": None,
                    "tr": None,
                    "v_z1": 1.5,
                    "sol_radiation_dir": 525.0,
                },
            }
            assert (
                json.loads(json.dumps(caught.value.detail, allow_nan=False)) == caught.value.detail
            )
            assert calculator.calls == 0
        else:
            response = await service.calculate_home_risk(payload)
            assert [point.time_utc for point in response.forecast] == [
                datetime(2026, 3, 9, 1, tzinfo=UTC)
            ]
            assert calculator.calls == 1

    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.levelno == logging.WARNING
    assert record.timezone == "Australia/Sydney"
    assert record.skipped_hours == [
        {"time_utc": "2026-03-09T00:00:00+00:00", "infinite_inputs": ["tdb", "tr"]},
        {"time_utc": "2026-03-09T02:00:00+00:00", "infinite_inputs": ["v_z1"]},
    ]
    assert logging.Formatter("%(message)s").format(record) == (
        "Skipping forecast hours with infinite required inputs in Australia/Sydney: "
        "2026-03-09T00:00:00+00:00: tdb, tr; 2026-03-09T02:00:00+00:00: v_z1"
    )


async def test_risk_service_logs_one_summary_per_cache_miss(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Summarise each new calculation without repeating warnings on cache hits."""

    df = _build_mrt_dataframe()
    df.loc[df.index[0], "tdb"] = float("inf")
    df.loc[df.index[2], "tr"] = float("-inf")
    _install_mrt_pipeline(monkeypatch, df=df)
    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
        max_entries=1000,
    )
    payload = RiskRequest(sport="SOCCER", latitude=-33.847, longitude=151.067, profile="ADULT")

    with caplog.at_level(logging.WARNING, logger="sma_extreme_heat_backend.services.risk_service"):
        response = await service.calculate_home_risk(payload)
        assert len(caplog.records) == 1
        cached_response = await service.calculate_home_risk(payload)
        assert len(caplog.records) == 1
        await service.calculate_home_risk(payload.model_copy(update={"profile": "UNDER_10"}))

    assert response == cached_response
    assert weather_client.calls == 2
    assert calculator.calls == 2
    assert [point.time_utc for point in response.forecast] == [datetime(2026, 3, 9, 1, tzinfo=UTC)]
    assert len(caplog.records) == 2
    for record in caplog.records:
        assert record.timezone == "Australia/Sydney"
        assert record.skipped_hours == [
            {"time_utc": "2026-03-09T00:00:00+00:00", "infinite_inputs": ["tdb"]},
            {"time_utc": "2026-03-09T02:00:00+00:00", "infinite_inputs": ["tr"]},
        ]


@pytest.mark.parametrize(
    ("provider_field", "required_field"),
    [("temperature_2m", "tdb"), ("direct_normal_irradiance", "sol_radiation_dir")],
)
@pytest.mark.parametrize("infinite_value", [float("inf"), float("-inf")])
async def test_risk_service_skips_infinite_provider_input_through_real_mrt(
    caplog: pytest.LogCaptureFixture,
    provider_field: str,
    required_field: str,
    infinite_value: float,
) -> None:
    """Keep usable hours through real provider parsing, solar geometry and solar gain."""

    timezone_name = "Australia/Adelaide"
    start = (datetime.now(tz=UTC) + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    times = [start + timedelta(hours=offset) for offset in range(3)]
    hourly = {
        "time": [
            timestamp.astimezone(ZoneInfo(timezone_name)).strftime("%Y-%m-%dT%H:%M")
            for timestamp in times
        ],
        "temperature_2m": [31.0, 32.0, 33.0],
        "relative_humidity_2m": [62.0, 63.0, 64.0],
        "wind_speed_10m": [1.5, 1.6, 1.7],
        "direct_normal_irradiance": [700.0, 750.0, 800.0],
    }
    hourly[provider_field][1] = infinite_value
    provider_payload = {
        "timezone": timezone_name,
        "hourly_units": {
            "temperature_2m": "°C",
            "relative_humidity_2m": "%",
            "wind_speed_10m": "m/s",
            "direct_normal_irradiance": "W/m²",
        },
        "hourly": hourly,
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["timezone"] == timezone_name
        # Deliberately encode Infinity in upstream bytes; HTTPX's json= disallows it.
        return httpx.Response(
            200,
            content=json.dumps(provider_payload),
            headers={"content-type": "application/json"},
        )

    calculator = FakeCalculator()
    async with httpx.AsyncClient(
        base_url="https://api.open-meteo.com/v1", transport=httpx.MockTransport(handler)
    ) as http_client:
        weather_client = OpenMeteoClient(
            base_url="https://api.open-meteo.com/v1",
            timeout_seconds=10,
            client=http_client,
        )
        service = RiskService(
            weather_client=weather_client,
            calculator=calculator,
            ttl_seconds=600,
            max_entries=1000,
        )
        with caplog.at_level(
            logging.WARNING, logger="sma_extreme_heat_backend.services.risk_service"
        ):
            response = await service.calculate_home_risk(
                RiskRequest(sport="SOCCER", latitude=-34.9285, longitude=138.6007, profile="ADULT")
            )

    assert response.request.location.timezone == timezone_name
    assert [point.time_utc for point in response.forecast] == [times[0], times[2]]
    assert calculator.calls == 2
    for point in response.forecast:
        assert all(isfinite(value) for value in point.inputs.model_dump().values())
        assert point.inputs.tr > point.inputs.tdb
    for payload in calculator.payloads:
        assert all(isfinite(value) for value in (payload.tdb, payload.tr, payload.rh, payload.vr))
    records = [
        record
        for record in caplog.records
        if record.name == "sma_extreme_heat_backend.services.risk_service"
    ]
    assert len(records) == 1
    record = records[0]
    assert record.timezone == timezone_name
    assert len(record.skipped_hours) == 1
    assert record.skipped_hours[0]["time_utc"] == times[1].isoformat()
    assert required_field in record.skipped_hours[0]["infinite_inputs"]
    message = logging.Formatter("%(message)s").format(record)
    assert timezone_name in message
    assert times[1].isoformat() in message
    assert required_field in message
