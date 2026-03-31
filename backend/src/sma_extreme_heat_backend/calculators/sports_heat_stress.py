from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Protocol

import numpy as np
from pythermalcomfort.models.sports_heat_stress_risk import Sports, sports_heat_stress_risk

from sma_extreme_heat_backend.core.errors import InvalidSportError, RiskCalculationError
from sma_extreme_heat_backend.schemas.home import ALLOWED_SPORTS


@dataclass(frozen=True)
class SportsHeatStressInput:
    """Normalized inputs expected by the pythermalcomfort heat-risk model."""

    sport: str
    tdb: float
    rh: float
    vr: float
    tr: float


@dataclass(frozen=True)
class SportsHeatStressOutput:
    """JSON-safe model output plus calculator diagnostics."""

    data: dict[str, Any]
    meta: dict[str, Any]


class SportsHeatStressCalculator(Protocol):
    """Protocol implemented by the pythermalcomfort calculator adapter."""

    def model_sports_heat_stress(self, payload: SportsHeatStressInput) -> SportsHeatStressOutput:
        """Run the sports heat-stress model for a single point."""


def _to_json_serializable(value: Any) -> Any:
    """Convert numpy-heavy pythermalcomfort output into JSON-safe primitives."""

    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {key: _to_json_serializable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_json_serializable(item) for item in value]
    if isinstance(value, tuple):
        return [_to_json_serializable(item) for item in value]
    return value


class PythermalcomfortSportsHeatStressCalculator(SportsHeatStressCalculator):
    """Adapter that runs the official pythermalcomfort sports heat-risk model."""

    def model_sports_heat_stress(self, payload: SportsHeatStressInput) -> SportsHeatStressOutput:
        """Run pythermalcomfort and preserve its output field names."""

        sport_enum = getattr(Sports, payload.sport, None)
        if sport_enum is None:
            raise InvalidSportError(sport=payload.sport, allowed_sports=list(ALLOWED_SPORTS))

        try:
            result = sports_heat_stress_risk(
                tdb=payload.tdb,
                tr=payload.tr,
                rh=payload.rh,
                vr=payload.vr,
                sport=sport_enum,
            )
        except Exception as exc:  # noqa: BLE001
            raise RiskCalculationError() from exc

        # Preserve pythermalcomfort keys exactly; only convert ndarray scalars for JSON transport.
        result_data = _to_json_serializable(asdict(result))

        return SportsHeatStressOutput(
            data=result_data,
            meta={
                "model": "pythermalcomfort.models.sports_heat_stress_risk",
                "inputs": {
                    "sport": payload.sport,
                    "tdb": payload.tdb,
                    "rh": payload.rh,
                    "vr": payload.vr,
                    "tr": _to_json_serializable(payload.tr),
                },
            },
        )
