from __future__ import annotations

import logging
import time

from pythermalcomfort.models import solar_gain

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    PythermalcomfortSportsHeatStressCalculator,
    SportsHeatStressInput,
)
from sma_extreme_heat_backend.services.mrt import MRT_MODEL_CONFIG

LOGGER = logging.getLogger(__name__)


def warm_up_models() -> None:
    """Run each pythermalcomfort model once so numba compiles before the first request.

    Without this, the first request on a new instance waits for numba to compile
    `solar_gain` and the PHS kernel inside `sports_heat_stress_risk` (about 0.8 s on a
    laptop, longer on Cloud Run). The Dockerfile also calls this at build time, so the
    compiled kernels ship in the image's numba cache.
    """

    start = time.perf_counter()
    solar_gain(
        sol_altitude=45.0,
        sharp=MRT_MODEL_CONFIG.sharp,
        sol_radiation_dir=600.0,
        sol_transmittance=MRT_MODEL_CONFIG.sol_transmittance,
        f_svv=MRT_MODEL_CONFIG.f_svv,
        f_bes=MRT_MODEL_CONFIG.f_bes,
        asw=MRT_MODEL_CONFIG.asw,
        posture=MRT_MODEL_CONFIG.posture,
        floor_reflectance=MRT_MODEL_CONFIG.floor_reflectance,
    )
    # tdb must be at least 23 °C, otherwise the model returns early without running PHS.
    PythermalcomfortSportsHeatStressCalculator().model_sports_heat_stress(
        SportsHeatStressInput(sport="SOCCER", tdb=30.0, rh=50.0, vr=1.0, tr=40.0)
    )
    LOGGER.info(
        "Warmed up pythermalcomfort models",
        extra={"duration_seconds": round(time.perf_counter() - start, 3)},
    )
