from __future__ import annotations

import logging
import time

import numpy as np

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    PythermalcomfortSportsHeatStressCalculator,
    SportsHeatStressInput,
)
from sma_extreme_heat_backend.services.mrt import compute_delta_mrt

LOGGER = logging.getLogger(__name__)

# sports_heat_stress_risk returns early without running PHS when tdb is below 23 °C,
# so the warm-up must use a higher air temperature to compile the PHS kernel.
WARM_UP_INPUT = SportsHeatStressInput(sport="SOCCER", tdb=30.0, rh=50.0, vr=1.0, tr=40.0)


def warm_up_models() -> None:
    """Run each pythermalcomfort model once so numba compiles before the first request.

    Without this, the first request on a new instance waits for numba to compile
    `solar_gain` and the PHS kernel inside `sports_heat_stress_risk` (about 0.8 s on a
    laptop, longer on Cloud Run). The Dockerfile also calls this at build time, so the
    compiled kernels ship in the image's numba cache.
    """

    start = time.perf_counter()
    compute_delta_mrt(sol_altitude=np.array([45.0]), sol_radiation_dir=np.array([600.0]))
    PythermalcomfortSportsHeatStressCalculator().model_sports_heat_stress(WARM_UP_INPUT)
    LOGGER.info(
        "Warmed up pythermalcomfort models",
        extra={"duration_seconds": round(time.perf_counter() - start, 3)},
    )


def warm_up_models_safely() -> None:
    """Warm up the models, but never stop the app from starting if that fails.

    A failure here only means the first request compiles the kernels itself.
    """

    try:
        warm_up_models()
    except Exception:  # noqa: BLE001
        LOGGER.exception("Model warm-up failed; the first request will compile the models")
