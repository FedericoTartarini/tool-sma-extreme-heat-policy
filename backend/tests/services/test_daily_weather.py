from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from sma_extreme_heat_backend.clients.open_meteo import (
    CalendarHourlyWeatherPoint,
    ProviderDailyWeather,
)
from sma_extreme_heat_backend.services.daily_weather import build_daily_weather

SYDNEY = ZoneInfo("Australia/Sydney")


def _hours(
    start: datetime,
    *,
    step_hours: int,
    tdb: list[float | None],
    rh: list[float | None],
    wind: list[float | None],
    uv: list[float | None],
) -> list[CalendarHourlyWeatherPoint]:
    """Build consecutive provider-local hours for aggregation tests."""

    return [
        CalendarHourlyWeatherPoint(
            time_local=start + timedelta(hours=idx * step_hours),
            tdb=tdb[idx],
            rh=rh[idx],
            v_z1=wind[idx],
            uv_index=uv[idx],
        )
        for idx in range(len(tdb))
    ]


def _daily(date_local: date) -> ProviderDailyWeather:
    return ProviderDailyWeather(
        date_local=date_local,
        sunrise_local="06:30",
        sunset_local="19:45",
        precipitation_probability_max_pct=40.0,
        precipitation_sum_mm=0.5,
    )


def test_build_daily_weather_aggregates_full_calendar_day() -> None:
    """Daily details should use every provider hour of the local calendar day."""

    hours = _hours(
        datetime(2026, 3, 9, 8, 0, tzinfo=SYDNEY),
        step_hours=4,
        tdb=[10.0, 30.0, 20.0],
        rh=[50.0, 22.0, 49.0],
        wind=[1.0, 3.0, 2.0],
        uv=[1.0, 8.5, 4.0],
    )

    [summary] = build_daily_weather(calendar_hours=hours, daily=[_daily(date(2026, 3, 9))])

    assert summary.date == date(2026, 3, 9)
    assert summary.min_temp_c == pytest.approx(10.0)
    assert summary.min_temp_time_local == "08:00"
    assert summary.max_temp_c == pytest.approx(30.0)
    assert summary.max_temp_time_local == "12:00"
    assert summary.humidity_at_max_pct == pytest.approx(22.0)
    assert summary.humidity_at_min_pct == pytest.approx(50.0)
    assert summary.uv_index_max == pytest.approx(8.5)
    assert summary.uv_index_max_time_local == "12:00"
    assert summary.avg_wind_speed_ms == pytest.approx(2.0)
    assert summary.sunrise_local == "06:30"
    assert summary.sunset_local == "19:45"
    assert summary.precip_prob_max_pct == pytest.approx(40.0)
    assert summary.cumulative_rainfall_mm == pytest.approx(0.5)


def test_build_daily_weather_uses_earliest_hour_on_temperature_tie() -> None:
    hours = _hours(
        datetime(2026, 3, 9, 8, 0, tzinfo=SYDNEY),
        step_hours=2,
        tdb=[30.0, 30.0, 18.0],
        rh=[40.0, 55.0, 60.0],
        wind=[1.0, 1.0, 1.0],
        uv=[0.0, 0.0, 0.0],
    )

    [summary] = build_daily_weather(calendar_hours=hours, daily=[])

    assert summary.max_temp_c == pytest.approx(30.0)
    assert summary.max_temp_time_local == "08:00"
    assert summary.humidity_at_max_pct == pytest.approx(40.0)


def test_build_daily_weather_groups_hours_by_provider_local_date() -> None:
    hours = _hours(
        datetime(2026, 3, 9, 22, 0, tzinfo=SYDNEY),
        step_hours=3,
        tdb=[12.0, 28.0],
        rh=[70.0, 30.0],
        wind=[2.0, 4.0],
        uv=[0.0, 6.0],
    )

    summaries = build_daily_weather(calendar_hours=hours, daily=[])

    assert [summary.date for summary in summaries] == [date(2026, 3, 9), date(2026, 3, 10)]
    assert summaries[1].max_temp_c == pytest.approx(28.0)
    assert summaries[1].max_temp_time_local == "01:00"
    assert summaries[1].uv_index_max == pytest.approx(6.0)


def test_build_daily_weather_keeps_hourly_details_without_provider_daily_rows() -> None:
    """A missing or invalid daily block only clears daylight and precipitation."""

    hours = _hours(
        datetime(2026, 3, 9, 12, 0, tzinfo=SYDNEY),
        step_hours=1,
        tdb=[31.0],
        rh=[62.0],
        wind=[1.5],
        uv=[7.5],
    )

    [summary] = build_daily_weather(calendar_hours=hours, daily=[])

    assert summary.max_temp_c == pytest.approx(31.0)
    assert summary.uv_index_max == pytest.approx(7.5)
    assert summary.avg_wind_speed_ms == pytest.approx(1.5)
    assert summary.sunrise_local is None
    assert summary.sunset_local is None
    assert summary.precip_prob_max_pct is None
    assert summary.cumulative_rainfall_mm is None


def test_build_daily_weather_keeps_provider_daily_row_without_hours() -> None:
    [summary] = build_daily_weather(calendar_hours=[], daily=[_daily(date(2026, 3, 9))])

    assert summary.date == date(2026, 3, 9)
    assert summary.sunrise_local == "06:30"
    assert summary.max_temp_c is None
    assert summary.max_temp_time_local is None
    assert summary.avg_wind_speed_ms is None
