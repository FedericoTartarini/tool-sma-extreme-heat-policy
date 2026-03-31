from __future__ import annotations

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    PythermalcomfortSportsHeatStressCalculator,
    SportsHeatStressInput,
)
from sma_extreme_heat_backend.core.errors import InvalidSportError


def test_model_sports_heat_stress_returns_pythermalcomfort_raw_keys() -> None:
    calculator = PythermalcomfortSportsHeatStressCalculator()

    result = calculator.model_sports_heat_stress(
        SportsHeatStressInput(
            sport="SOCCER",
            tdb=30.0,
            rh=60.0,
            vr=1.2,
            tr=35.0,
        )
    )

    assert "risk_level_interpolated" in result.data
    assert "t_medium" in result.data
    assert "t_high" in result.data
    assert "t_extreme" in result.data
    assert "recommendation" in result.data
    assert result.meta["model"] == "pythermalcomfort.models.sports_heat_stress_risk"


def test_model_sports_heat_stress_rejects_non_official_sport_name() -> None:
    calculator = PythermalcomfortSportsHeatStressCalculator()

    try:
        calculator.model_sports_heat_stress(
            SportsHeatStressInput(
                sport="soccer",
                tdb=30.0,
                rh=60.0,
                vr=1.2,
                tr=35.0,
            )
        )
    except InvalidSportError as exc:
        assert exc.status_code == 422
        assert exc.detail["sport"] == "soccer"
    else:
        raise AssertionError("Expected InvalidSportError")
