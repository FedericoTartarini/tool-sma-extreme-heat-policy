from __future__ import annotations

from sma_extreme_heat_backend.schemas.home import ForecastPoint


def get_today_max_risk_level_interpolated(forecast: list[ForecastPoint]) -> float:
    """Return the max interpolated risk score for the current local calendar day."""

    if not forecast:
        raise ValueError("Forecast must contain at least one point")

    today = forecast[0].time_local.date()
    today_max = forecast[0].heat_risk.risk_level_interpolated

    for point in forecast[1:]:
        if point.time_local.date() != today:
            continue
        today_max = max(today_max, point.heat_risk.risk_level_interpolated)

    return float(today_max)
