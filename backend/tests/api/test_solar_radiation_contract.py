from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from sma_extreme_heat_backend.calculators.sports_heat_stress import (
    PythermalcomfortSportsHeatStressCalculator,
)
from sma_extreme_heat_backend.clients.open_meteo import HourlyWeatherPoint, WeatherForecast
from sma_extreme_heat_backend.main import create_app
from sma_extreme_heat_backend.services import mrt
from sma_extreme_heat_backend.services.risk_service import RiskService, get_risk_service

REQUEST = {
    "sport": "SOCCER",
    "profile": "ADULT",
    "latitude": -33.847,
    "longitude": 151.067,
}


class RadiationWeatherClient:
    """Supply fixed weather while retaining the real MRT and risk calculations."""

    def __init__(self, radiation: list[float | None]) -> None:
        self.points = [
            HourlyWeatherPoint(
                time_utc=datetime(2026, 3, 9, 0, tzinfo=UTC) + timedelta(hours=index),
                tdb=30.0,
                rh=60.0,
                wind=2.0,
                radiation=value,
            )
            for index, value in enumerate(radiation)
        ]

    async def fetch_weather_forecast(self, **kwargs: object) -> WeatherForecast:
        return WeatherForecast(points=self.points)

    async def aclose(self) -> None:
        pass


def _create_test_app(radiation: list[float | None]):
    app = create_app()
    service = RiskService(
        weather_client=RadiationWeatherClient(radiation),
        calculator=PythermalcomfortSportsHeatStressCalculator(),
        ttl_seconds=0,
    )
    app.dependency_overrides[get_risk_service] = lambda: service
    return app


@pytest.mark.parametrize(("raw", "adjusted"), [(0.0, 0.0), (800.0, 600.0)])
def test_api_radiation_matches_actual_solar_gain_input(raw: float, adjusted: float) -> None:
    """Expose the once-adjusted model input, not raw or twice-adjusted radiation."""
    with (
        patch.object(mrt, "solar_gain", wraps=mrt.solar_gain) as solar_gain,
        TestClient(_create_test_app([raw])) as client,
    ):
        response = client.post("/home/risk", json=REQUEST)

    assert response.status_code == 200
    inputs = response.json()["forecast"][0]["inputs"]
    solar_gain.assert_called_once()
    assert solar_gain.call_args.kwargs["sol_radiation_dir"] == pytest.approx(adjusted)
    assert inputs["sol_radiation_dir"] == pytest.approx(adjusted)
    assert "direct_normal_irradiance_wm2" not in inputs


def test_api_missing_radiation_returns_new_field_name() -> None:
    """Missing radiation must remain missing and be reported under the public key."""
    with TestClient(_create_test_app([None])) as client:
        response = client.post("/home/risk", json=REQUEST)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert set(detail["unknown_inputs"]) == {"sol_radiation_dir", "tr"}
    assert detail["available_inputs"]["sol_radiation_dir"] is None
    assert "direct_normal_irradiance_wm2" not in detail["available_inputs"]


def test_api_skips_missing_radiation_before_complete_point() -> None:
    """A missing leading point must not hide the next valid adjusted forecast."""
    with TestClient(_create_test_app([None, 800.0])) as client:
        response = client.post("/home/risk", json=REQUEST)

    assert response.status_code == 200
    forecast = response.json()["forecast"]
    assert len(forecast) == 1
    assert forecast[0]["time_utc"] == "2026-03-09T01:00:00Z"
    assert forecast[0]["inputs"]["sol_radiation_dir"] == pytest.approx(600.0)
