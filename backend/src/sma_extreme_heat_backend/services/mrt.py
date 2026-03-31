from __future__ import annotations

import logging
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC
from functools import cache
from typing import Any

import pandas as pd
from pvlib import location
from pythermalcomfort.models import solar_gain
from timezonefinder import TimezoneFinder

from sma_extreme_heat_backend.clients.open_meteo import HourlyWeatherPoint
from sma_extreme_heat_backend.core.errors import (
    RiskCalculationError,
    WeatherProviderError,
)

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class MrtModelConfig:
    """Constants used by the MRT solar-gain pipeline."""

    sharp: int = 45
    sol_transmittance: float = 1.0
    f_svv: float = 0.8
    f_bes: float = 1.0
    asw: float = 0.6
    posture: str = "standing"
    floor_reflectance: float = 0.25
    solar_radiation_correction_coefficient: float = 0.75


MRT_MODEL_CONFIG = MrtModelConfig()

MRT_COLUMNS: tuple[str, ...] = (
    "tdb",
    "rh",
    "wind",
    "radiation",
    "elevation",
    "dni",
    "delta_mrt",
    "tr",
)


@cache
def _get_timezone_finder() -> TimezoneFinder:
    """Return a cached timezone finder instance."""

    return TimezoneFinder(in_memory=True)


def resolve_timezone_name(*, latitude: float, longitude: float) -> str:
    """Resolve an IANA timezone from coordinates."""

    timezone_name = _get_timezone_finder().timezone_at(lat=latitude, lng=longitude)
    if not isinstance(timezone_name, str) or timezone_name.strip() == "":
        raise WeatherProviderError("Could not resolve location timezone from coordinates")
    return timezone_name


def _extract_delta_mrt(result: Any) -> float:
    """Normalize `solar_gain` output into a single delta MRT float."""

    delta_mrt = getattr(result, "delta_mrt", None)
    if delta_mrt is None and isinstance(result, Mapping):
        delta_mrt = result.get("delta_mrt")

    if delta_mrt is None:
        raise RiskCalculationError("Solar gain result did not include delta_mrt")

    return float(delta_mrt)


def _points_to_dataframe(points: list[HourlyWeatherPoint]) -> pd.DataFrame:
    """Convert weather forecast points into a time-indexed DataFrame."""

    if not points:
        raise WeatherProviderError("Weather provider returned no hourly points")

    df = pd.DataFrame(
        {
            "time": [point.time_utc for point in points],
            "tdb": [point.tdb for point in points],
            "rh": [point.rh for point in points],
            "wind": [point.wind for point in points],
            "radiation": [point.radiation for point in points],
        }
    )
    df["time"] = pd.to_datetime(df["time"], utc=True)
    return df


def build_mrt_dataframe(
    *,
    points: list[HourlyWeatherPoint],
    latitude: float,
    longitude: float,
    timezone_name: str,
) -> pd.DataFrame:
    """Build the MRT-enriched half-hourly DataFrame used by the risk service."""

    df_weather = _points_to_dataframe(points)
    df_weather = df_weather.set_index("time").sort_index()
    df_weather = df_weather.copy()
    # Convert provider UTC timestamps into the resolved local timezone before resampling.
    df_weather.index = df_weather.index.tz_convert(timezone_name)

    now = pd.Timestamp.now(tz=timezone_name) - pd.Timedelta(hours=1)
    df_weather = df_weather[df_weather.index >= now]
    if df_weather.empty:
        raise WeatherProviderError("No hourly record after now-1h")

    df_weather = df_weather.dropna(subset=["tdb"])
    if df_weather.empty:
        raise WeatherProviderError("No hourly record with tdb after now-1h")

    # Interpolate onto a 30-minute grid so forecast charts and current selection share one pipeline.
    df_weather = df_weather.resample("30min").interpolate()

    site = location.Location(
        latitude,
        longitude,
        tz=timezone_name,
        name=timezone_name,
    )
    solar_position = site.get_solarposition(df_weather.index)
    solar_position = solar_position[["elevation"]].copy()
    solar_position.loc[solar_position["elevation"] < 0, "elevation"] = 0

    df_result = pd.concat([df_weather.copy(), solar_position], axis=1)
    df_result["dni"] = (
        df_result["radiation"] * MRT_MODEL_CONFIG.solar_radiation_correction_coefficient
    )

    delta_mrt_values: list[float] = []
    negative_delta_mrt_values: list[float] = []
    for row in df_result.itertuples():
        if pd.isna(row.elevation) or pd.isna(row.dni):
            delta_mrt_values.append(float("nan"))
            continue

        delta_mrt = _extract_delta_mrt(
            solar_gain(
                sol_altitude=float(row.elevation),
                sharp=MRT_MODEL_CONFIG.sharp,
                sol_radiation_dir=float(row.dni),
                sol_transmittance=MRT_MODEL_CONFIG.sol_transmittance,
                f_svv=MRT_MODEL_CONFIG.f_svv,
                f_bes=MRT_MODEL_CONFIG.f_bes,
                asw=MRT_MODEL_CONFIG.asw,
                posture=MRT_MODEL_CONFIG.posture,
                floor_reflectance=MRT_MODEL_CONFIG.floor_reflectance,
            )
        )
        if delta_mrt < 0:
            negative_delta_mrt_values.append(delta_mrt)
        delta_mrt_values.append(delta_mrt)

    if negative_delta_mrt_values:
        LOGGER.warning(
            "Calculated negative delta_mrt values during MRT pipeline",
            extra={
                "count": len(negative_delta_mrt_values),
                "min_delta_mrt": min(negative_delta_mrt_values),
                "timezone": timezone_name,
            },
        )

    df_result["delta_mrt"] = delta_mrt_values
    df_result["tr"] = df_result["tdb"] + df_result["delta_mrt"]

    return df_result.loc[:, list(MRT_COLUMNS)].copy()


def select_hourly_forecast_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Keep only rows aligned to UTC hour boundaries for the public forecast."""

    if df.empty:
        return df.copy()

    utc_index = df.index.tz_convert(UTC)
    return df.loc[utc_index.minute == 0].copy()
