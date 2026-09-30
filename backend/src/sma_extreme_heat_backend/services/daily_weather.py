from __future__ import annotations

from collections.abc import Callable
from datetime import date

from sma_extreme_heat_backend.clients.open_meteo import (
    CalendarHourlyWeatherPoint,
    ProviderDailyWeather,
)
from sma_extreme_heat_backend.schemas.home import DailyWeatherSummary


def _time_label(point: CalendarHourlyWeatherPoint | None) -> str | None:
    """Format a provider-local hour as the public HH:MM label."""

    return point.time_local.strftime("%H:%M") if point else None


def _select_extreme_hour(
    hours: list[CalendarHourlyWeatherPoint],
    value_of: Callable[[CalendarHourlyWeatherPoint], float | None],
    *,
    pick_max: bool,
) -> CalendarHourlyWeatherPoint | None:
    """Pick the max/min hour; when values tie, use the earliest local hour."""

    valid = [hour for hour in hours if value_of(hour) is not None]
    if not valid:
        return None

    compare = max if pick_max else min
    extreme_value = compare(value_of(hour) for hour in valid)
    return min(
        (hour for hour in valid if value_of(hour) == extreme_value),
        key=lambda hour: hour.time_local,
    )


def _build_day(
    *,
    date_local: date,
    hours: list[CalendarHourlyWeatherPoint],
    daily: ProviderDailyWeather | None,
) -> DailyWeatherSummary:
    """Combine one day's hourly-derived stats with the provider's daily row."""

    max_temp_hour = _select_extreme_hour(hours, lambda hour: hour.tdb, pick_max=True)
    min_temp_hour = _select_extreme_hour(hours, lambda hour: hour.tdb, pick_max=False)
    max_uv_hour = _select_extreme_hour(hours, lambda hour: hour.uv_index, pick_max=True)
    wind_values = [hour.v_z1 for hour in hours if hour.v_z1 is not None]

    return DailyWeatherSummary(
        date=date_local,
        sunrise_local=daily.sunrise_local if daily else None,
        sunset_local=daily.sunset_local if daily else None,
        uv_index_max=max_uv_hour.uv_index if max_uv_hour else None,
        precip_prob_max_pct=daily.precipitation_probability_max_pct if daily else None,
        cumulative_rainfall_mm=daily.rain_sum_mm if daily else None,
        max_temp_c=max_temp_hour.tdb if max_temp_hour else None,
        min_temp_c=min_temp_hour.tdb if min_temp_hour else None,
        max_temp_time_local=_time_label(max_temp_hour),
        min_temp_time_local=_time_label(min_temp_hour),
        humidity_at_max_pct=max_temp_hour.rh if max_temp_hour else None,
        humidity_at_min_pct=min_temp_hour.rh if min_temp_hour else None,
        uv_index_max_time_local=_time_label(max_uv_hour),
        avg_wind_speed_ms=sum(wind_values) / len(wind_values) if wind_values else None,
    )


def build_daily_weather(
    *,
    calendar_hours: list[CalendarHourlyWeatherPoint],
    daily: list[ProviderDailyWeather],
) -> list[DailyWeatherSummary]:
    """Build per-day weather details from full-calendar-day hours and provider daily rows.

    Hourly stats use every provider hour of the local day, not the risk-trimmed forecast
    window. A day appears when either source has data, so a missing or invalid daily
    block only clears daylight and precipitation.
    """

    hours_by_date: dict[date, list[CalendarHourlyWeatherPoint]] = {}
    for hour in calendar_hours:
        hours_by_date.setdefault(hour.time_local.date(), []).append(hour)
    daily_by_date = {row.date_local: row for row in daily}

    return [
        _build_day(
            date_local=date_local,
            hours=hours_by_date.get(date_local, []),
            daily=daily_by_date.get(date_local),
        )
        for date_local in sorted(hours_by_date.keys() | daily_by_date.keys())
    ]
