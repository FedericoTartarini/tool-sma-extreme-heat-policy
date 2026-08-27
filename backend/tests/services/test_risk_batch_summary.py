from __future__ import annotations

import pytest

from sma_extreme_heat_backend.schemas.home import (
    ForecastHeatRisk,
    ForecastInputs,
    ForecastPoint,
)
from sma_extreme_heat_backend.services.batch_summary import (
    get_today_max_risk_level_interpolated,
)


def _forecast_point(
    *,
    time_local: str,
    risk_level_interpolated: float,
) -> ForecastPoint:
    return ForecastPoint(
        time_utc="2026-03-09T00:00:00Z",
        time_local=time_local,
        inputs=ForecastInputs(
            air_temperature_c=31.0,
            mean_radiant_temperature_c=37.25,
            relative_humidity_pct=62.0,
            wind_speed_10m_ms=1.5,
            direct_normal_irradiance_wm2=700.0,
        ),
        heat_risk=ForecastHeatRisk(
            risk_level_interpolated=risk_level_interpolated,
            t_medium=34.5,
            t_high=37.1,
            t_extreme=39.2,
            recommendation="Increase hydration & modify clothing",
        ),
    )


def test_get_today_max_risk_level_interpolated_returns_single_point_value() -> None:
    """A one-point forecast should use that point as today's max."""

    forecast = [
        _forecast_point(
            time_local="2026-03-09T11:00:00+11:00",
            risk_level_interpolated=1.2,
        )
    ]

    assert get_today_max_risk_level_interpolated(forecast) == 1.2


def test_get_today_max_risk_level_interpolated_returns_max_for_same_local_day() -> None:
    """Today's max should include every hourly point on the current local date."""

    forecast = [
        _forecast_point(time_local="2026-03-09T11:00:00+11:00", risk_level_interpolated=1.2),
        _forecast_point(time_local="2026-03-09T12:00:00+11:00", risk_level_interpolated=1.4),
        _forecast_point(time_local="2026-03-09T13:00:00+11:00", risk_level_interpolated=1.9),
    ]

    assert get_today_max_risk_level_interpolated(forecast) == 1.9


def test_get_today_max_risk_level_interpolated_ignores_later_local_days() -> None:
    """Points on later local dates should not affect today's max."""

    forecast = [
        _forecast_point(time_local="2026-03-09T22:00:00+11:00", risk_level_interpolated=1.2),
        _forecast_point(time_local="2026-03-09T23:00:00+11:00", risk_level_interpolated=1.5),
        _forecast_point(time_local="2026-03-10T00:00:00+11:00", risk_level_interpolated=4.8),
    ]

    assert get_today_max_risk_level_interpolated(forecast) == 1.5


def test_get_today_max_risk_level_interpolated_uses_first_point_local_date() -> None:
    """The current local date should be derived from the earliest complete forecast point."""

    forecast = [
        _forecast_point(time_local="2026-03-09T23:30:00+10:30", risk_level_interpolated=2.0),
        _forecast_point(time_local="2026-03-10T00:30:00+10:30", risk_level_interpolated=3.5),
    ]

    assert get_today_max_risk_level_interpolated(forecast) == 2.0


def test_get_today_max_risk_level_interpolated_requires_forecast_points() -> None:
    """An empty forecast should fail fast."""

    with pytest.raises(ValueError, match="at least one point"):
        get_today_max_risk_level_interpolated([])
