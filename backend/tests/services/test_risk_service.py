from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pandas as pd
import pytest

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    SportsHeatStressInput,
    SportsHeatStressOutput,
)
from sma_extreme_heat_backend.clients.open_meteo import HourlyWeatherPoint, WeatherForecast
from sma_extreme_heat_backend.core.errors import ModelInputUnavailableError
from sma_extreme_heat_backend.schemas.home import RiskRequest
from sma_extreme_heat_backend.services.risk_service import RiskService


class FakeWeatherClient:
    """Test double that returns a deterministic hourly forecast."""

    def __init__(
        self,
        *,
        expected_latitude: float | None = -33.847,
        expected_longitude: float | None = 151.067,
    ) -> None:
        self.calls = 0
        self.expected_latitude = expected_latitude
        self.expected_longitude = expected_longitude
        base_time = datetime(2026, 3, 9, 0, 0, tzinfo=UTC)
        self.points = [
            HourlyWeatherPoint(
                raw_time=(base_time + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:%M"),
                time_utc=base_time + timedelta(hours=offset),
                tdb=31.0 + offset,
                rh=62.0 + offset,
                wind=1.5 + (offset * 0.1),
                radiation=700.0 + (offset * 50.0),
            )
            for offset in range(3)
        ]

    async def fetch_weather_forecast(self, *, latitude: float, longitude: float) -> WeatherForecast:
        """Return the deterministic forecast and track request counts."""

        self.calls += 1
        if self.expected_latitude is not None:
            assert latitude == self.expected_latitude
        if self.expected_longitude is not None:
            assert longitude == self.expected_longitude
        return WeatherForecast(
            points=self.points,
            raw={"provider": "open-meteo", "timezone": "GMT"},
            provider_timezone="GMT",
        )

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
    wind_start: float = 1.5,
    tr_offset: float = 6.25,
    current_missing: set[str] | None = None,
    future_missing_by_row: dict[int, set[str]] | None = None,
) -> pd.DataFrame:
    """Build a deterministic MRT dataframe for service tests."""

    current_missing = current_missing or set()
    future_missing_by_row = future_missing_by_row or {}
    index_utc = pd.date_range(
        start="2026-03-09T00:00:00Z",
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
            "wind": wind_start + (offset * 0.1),
            "radiation": 700.0 + (offset * 50.0),
            "elevation": 50.0 + offset,
            "dni": 525.0 + (offset * 37.5),
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
        "air_temperature_c": 31.0,
        "mean_radiant_temperature_c": 37.25,
        "relative_humidity_pct": 62.0,
        "wind_speed_10m_ms": 1.5,
        "wind_speed_effective_ms": 1.02,
        "direct_normal_irradiance_wm2": 700.0,
    }
    assert first.forecast[0].heat_risk.model_dump() == {
        "risk_level_interpolated": 1.94,
        "t_medium": 34.5,
        "t_high": 37.1,
        "t_extreme": 39.2,
        "recommendation": "Increase hydration & modify clothing",
    }
    assert first.model_dump()["forecast"] == [
        {
            "time_utc": "2026-03-09T00:00:00Z",
            "inputs": {
                "air_temperature_c": 31.0,
                "mean_radiant_temperature_c": 37.25,
                "relative_humidity_pct": 62.0,
                "wind_speed_10m_ms": 1.5,
                "wind_speed_effective_ms": 1.02,
                "direct_normal_irradiance_wm2": 700.0,
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
            "inputs": {
                "air_temperature_c": 32.0,
                "mean_radiant_temperature_c": 38.25,
                "relative_humidity_pct": 63.0,
                "wind_speed_10m_ms": 1.6,
                "wind_speed_effective_ms": 1.09,
                "direct_normal_irradiance_wm2": 750.0,
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
            "inputs": {
                "air_temperature_c": 33.0,
                "mean_radiant_temperature_c": 39.25,
                "relative_humidity_pct": 64.0,
                "wind_speed_10m_ms": 1.7,
                "wind_speed_effective_ms": 1.16,
                "direct_normal_irradiance_wm2": 800.0,
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


async def test_risk_service_cache_key_changes_with_profile(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Profile changes should produce independent cache entries."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
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
            latitude=-33.847,
            longitude=151.067,
            profile="KIDS",
        )
    )

    assert weather_client.calls == 2
    assert calculator.calls == 6


async def test_risk_service_returns_same_forecast_for_adult_and_kids_profiles(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Adult and kids currently map to the same pythermalcomfort model path."""

    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe())

    adult_service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=FakeCalculator(),
        ttl_seconds=600,
    )
    kids_service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=FakeCalculator(),
        ttl_seconds=600,
    )

    adult = await adult_service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )
    kids = await kids_service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="KIDS",
        )
    )

    assert adult.request.profile == "ADULT"
    assert kids.request.profile == "KIDS"
    assert [point.model_dump() for point in adult.forecast] == [
        point.model_dump() for point in kids.forecast
    ]


async def test_risk_service_uses_sport_default_when_scaled_wind_is_lower(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Sport wind-speed floors should override slower scaled wind speeds."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe(wind_start=0.9))
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
    )

    response = await service.calculate_home_risk(
        RiskRequest(
            sport="SOCCER",
            latitude=-33.847,
            longitude=151.067,
            profile="ADULT",
        )
    )

    assert calculator.payloads[0].vr == 1.0
    assert response.forecast[0].inputs.wind_speed_effective_ms == 1.0


async def test_risk_service_preserves_scaled_wind_when_above_sport_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Scaled wind speed should pass through when already above the sport floor."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe(wind_start=4.0))
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
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
    assert response.forecast[0].inputs.wind_speed_effective_ms == pytest.approx(2.72)


async def test_risk_service_skips_future_points_with_missing_inputs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Future rows with missing inputs should be skipped instead of failing the request."""

    weather_client = FakeWeatherClient()
    calculator = FakeCalculator()
    _install_mrt_pipeline(
        monkeypatch,
        df=_build_mrt_dataframe(future_missing_by_row={1: {"wind"}}),
    )
    service = RiskService(
        weather_client=weather_client,
        calculator=calculator,
        ttl_seconds=600,
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
    assert [point.time_utc for point in response.forecast] == [
        "2026-03-09T00:00:00Z",
        "2026-03-09T02:00:00Z",
    ]


async def test_risk_service_skips_incomplete_leading_rows_and_uses_next_complete_point(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Leading incomplete rows should be skipped until the first complete forecast point."""

    _install_mrt_pipeline(monkeypatch, df=_build_mrt_dataframe(current_missing={"wind"}))
    calculator = FakeCalculator()
    service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=calculator,
        ttl_seconds=600,
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
    assert [point.time_utc for point in response.forecast] == [
        "2026-03-09T01:00:00Z",
        "2026-03-09T02:00:00Z",
    ]
    assert response.forecast[0].inputs.model_dump() == {
        "air_temperature_c": 32.0,
        "mean_radiant_temperature_c": 38.25,
        "relative_humidity_pct": 63.0,
        "wind_speed_10m_ms": 1.6,
        "wind_speed_effective_ms": 1.09,
        "direct_normal_irradiance_wm2": 750.0,
    }


async def test_risk_service_raises_422_when_no_complete_forecast_point_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A 422 should only be returned when every forecast candidate row is incomplete."""

    _install_mrt_pipeline(
        monkeypatch,
        df=_build_mrt_dataframe(
            current_missing={"wind"},
            future_missing_by_row={1: {"wind"}, 2: {"wind"}},
        ),
    )
    service = RiskService(
        weather_client=FakeWeatherClient(),
        calculator=FakeCalculator(),
        ttl_seconds=600,
    )

    try:
        await service.calculate_home_risk(
            RiskRequest(
                sport="SOCCER",
                latitude=-33.847,
                longitude=151.067,
                profile="ADULT",
            )
        )
    except ModelInputUnavailableError as exc:
        assert exc.status_code == 422
        assert exc.detail["unknown_inputs"] == ["wind_speed_10m_ms"]
        assert exc.detail["available_inputs"] == {
            "air_temperature_c": 31.0,
            "mean_radiant_temperature_c": 37.25,
            "relative_humidity_pct": 62.0,
            "wind_speed_10m_ms": None,
            "wind_speed_effective_ms": None,
            "direct_normal_irradiance_wm2": 700.0,
        }
    else:
        raise AssertionError("Expected ModelInputUnavailableError")
