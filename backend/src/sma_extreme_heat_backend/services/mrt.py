from __future__ import annotations

import logging
from collections.abc import Mapping
from dataclasses import dataclass
from functools import cache
from typing import Any

import numpy as np
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
    "v_z1",
    "dni",
    "elevation",
    "sol_radiation_dir",
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


def _extract_delta_mrt(result: Any, *, size: int) -> np.ndarray:
    """Normalize `solar_gain` output into a float array of delta MRT values of length `size`."""

    delta_mrt = getattr(result, "delta_mrt", None)
    if delta_mrt is None and isinstance(result, Mapping):
        delta_mrt = result.get("delta_mrt")

    if delta_mrt is None:
        raise RiskCalculationError("Solar gain result did not include delta_mrt")

    try:
        return np.broadcast_to(np.asarray(delta_mrt, dtype=float), (size,))
    except ValueError as exc:
        raise RiskCalculationError("Solar gain returned an unexpected number of values") from exc


def _points_to_dataframe(points: list[HourlyWeatherPoint]) -> pd.DataFrame:
    """Convert weather forecast points into a time-indexed DataFrame."""

    if not points:
        raise WeatherProviderError("Weather provider returned no hourly points")

    df = pd.DataFrame(
        {
            "time": [point.time_utc for point in points],
            "tdb": [point.tdb for point in points],
            "rh": [point.rh for point in points],
            "v_z1": [point.v_z1 for point in points],
            "dni": [point.dni for point in points],
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
    """Build the MRT-enriched hourly DataFrame used by the risk service."""

    df_weather = _points_to_dataframe(points)
    df_weather = df_weather.set_index("time").sort_index()
    df_weather = df_weather.copy()
    # The provider window is already trimmed upstream in UTC. From here on we only need the
    # resolved local timezone so solar geometry is computed against location-local timestamps.
    df_weather.index = df_weather.index.tz_convert(timezone_name)

    df_weather = df_weather.dropna(subset=["tdb"])
    if df_weather.empty:
        raise WeatherProviderError("No hourly record with tdb in provider forecast window")

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
    df_result["sol_radiation_dir"] = (
        df_result["dni"] * MRT_MODEL_CONFIG.solar_radiation_correction_coefficient
    )

    # One array call for all rows: per-row scalar calls repeat solar_gain's validation and
    # numba dispatch for every hour. Rows missing an input keep delta_mrt as NaN.
    valid = df_result["elevation"].notna() & df_result["sol_radiation_dir"].notna()
    delta_mrt = pd.Series(np.nan, index=df_result.index, dtype=float)
    if valid.any():
        delta_mrt.loc[valid] = _extract_delta_mrt(
            solar_gain(
                sol_altitude=df_result.loc[valid, "elevation"].to_numpy(dtype=float),
                sharp=MRT_MODEL_CONFIG.sharp,
                sol_radiation_dir=df_result.loc[valid, "sol_radiation_dir"].to_numpy(dtype=float),
                sol_transmittance=MRT_MODEL_CONFIG.sol_transmittance,
                f_svv=MRT_MODEL_CONFIG.f_svv,
                f_bes=MRT_MODEL_CONFIG.f_bes,
                asw=MRT_MODEL_CONFIG.asw,
                posture=MRT_MODEL_CONFIG.posture,
                floor_reflectance=MRT_MODEL_CONFIG.floor_reflectance,
            ),
            size=int(valid.sum()),
        )

    negative_delta_mrt = delta_mrt[delta_mrt < 0]
    if not negative_delta_mrt.empty:
        LOGGER.warning(
            "Calculated negative delta_mrt values during MRT pipeline",
            extra={
                "count": len(negative_delta_mrt),
                "min_delta_mrt": float(negative_delta_mrt.min()),
                "timezone": timezone_name,
            },
        )

    df_result["delta_mrt"] = delta_mrt
    df_result["tr"] = df_result["tdb"] + df_result["delta_mrt"]

    return df_result.loc[:, list(MRT_COLUMNS)].copy()
