from __future__ import annotations

import pytest

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    PythermalcomfortSportsHeatStressCalculator,
    SportsHeatStressInput,
)
from sma_extreme_heat_backend.core.errors import InvalidSportError


@pytest.mark.parametrize("sport", ["SOCCER", "CROQUET"])
def test_model_sports_heat_stress_returns_pythermalcomfort_raw_keys(sport: str) -> None:
    calculator = PythermalcomfortSportsHeatStressCalculator()

    result = calculator.model_sports_heat_stress(
        SportsHeatStressInput(
            sport=sport,
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
    assert result.meta["inputs"]["sport"] == sport


# Reference outputs from pythermalcomfort 4.8.1. If an upgrade changes them, check the new
# values are intended, then update this table in the same PR as the version bump.
@pytest.mark.parametrize(
    ("sport", "tdb", "tr", "rh", "vr", "expected"),
    [
        ("SOCCER", 22.0, 60.0, 50.0, 1.0, (1.0, 23.0, 25.0, 26.0)),
        ("SOCCER", 28.0, 45.0, 80.0, 0.3, (1.6, 30.5, 31.6, 32.7)),
        ("SOCCER", 35.0, 55.0, 40.0, 2.0, (2.1, 34.5, 39.0, 41.3)),
        ("RUNNING", 40.0, 60.0, 20.0, 2.0, (3.9, 33.4, 36.9, 40.3)),
        ("CROQUET", 30.0, 35.0, 60.0, 1.2, (1.6, 34.5, 38.1, 39.9)),
    ],
)
def test_model_sports_heat_stress_matches_reference_values(
    sport: str,
    tdb: float,
    tr: float,
    rh: float,
    vr: float,
    expected: tuple[float, float, float, float],
) -> None:
    calculator = PythermalcomfortSportsHeatStressCalculator()

    result = calculator.model_sports_heat_stress(
        SportsHeatStressInput(sport=sport, tdb=tdb, rh=rh, vr=vr, tr=tr)
    )

    actual = tuple(
        result.data[key] for key in ("risk_level_interpolated", "t_medium", "t_high", "t_extreme")
    )
    assert actual == pytest.approx(expected, abs=1e-9)


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
