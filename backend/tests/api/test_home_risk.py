from __future__ import annotations

from fastapi.testclient import TestClient

from sma_extreme_heat_backend.api.routes import get_risk_service
from sma_extreme_heat_backend.core.errors import ModelInputUnavailableError, WeatherProviderError
from sma_extreme_heat_backend.main import create_app
from sma_extreme_heat_backend.schemas.home import (
    ForecastHeatRisk,
    ForecastInputs,
    ForecastPoint,
    LocationSummary,
    RequestSummary,
    RiskRequest,
    RiskResponse,
)


class SuccessfulRiskService:
    """Route test double that returns a valid forecast-centric response."""

    async def calculate_home_risk(self, payload: RiskRequest) -> RiskResponse:
        """Return a stable response for API contract assertions."""

        assert payload.sport == "SOCCER"
        assert payload.latitude == -33.847
        assert payload.longitude == 151.067
        assert payload.profile == "ADULT"
        return RiskResponse(
            request=RequestSummary(
                sport="SOCCER",
                profile="ADULT",
                location=LocationSummary(
                    latitude=-33.847,
                    longitude=151.067,
                    timezone="Australia/Sydney",
                ),
            ),
            forecast=[
                ForecastPoint(
                    time_utc="2026-03-09T00:00:00Z",
                    inputs=ForecastInputs(
                        air_temperature_c=31.0,
                        mean_radiant_temperature_c=37.25,
                        relative_humidity_pct=62.0,
                        wind_speed_10m_ms=1.5,
                        wind_speed_effective_ms=1.02,
                        direct_normal_irradiance_wm2=700.0,
                    ),
                    heat_risk=ForecastHeatRisk(
                        risk_level_interpolated=1.2,
                        t_medium=34.5,
                        t_high=37.1,
                        t_extreme=39.2,
                        recommendation="Increase hydration & modify clothing",
                    ),
                ),
                ForecastPoint(
                    time_utc="2026-03-09T01:00:00Z",
                    inputs=ForecastInputs(
                        air_temperature_c=32.0,
                        mean_radiant_temperature_c=38.1,
                        relative_humidity_pct=61.0,
                        wind_speed_10m_ms=1.6,
                        wind_speed_effective_ms=1.09,
                        direct_normal_irradiance_wm2=740.0,
                    ),
                    heat_risk=ForecastHeatRisk(
                        risk_level_interpolated=1.4,
                        t_medium=34.5,
                        t_high=37.1,
                        t_extreme=39.2,
                        recommendation="Increase hydration & modify clothing",
                    ),
                ),
            ],
        )


class FailingRiskService:
    """Route test double that simulates upstream weather failure."""

    async def calculate_home_risk(self, payload: RiskRequest) -> RiskResponse:
        """Match the route dependency contract while raising an upstream error."""

        raise WeatherProviderError()


class MissingInputRiskService:
    """Route test double that simulates missing current inputs."""

    async def calculate_home_risk(self, payload: RiskRequest) -> RiskResponse:
        """Raise the same 422 the real service would return."""

        raise ModelInputUnavailableError(
            unknown_inputs=["wind_speed_10m_ms"],
            available_inputs={
                "air_temperature_c": 30.0,
                "mean_radiant_temperature_c": 35.0,
                "relative_humidity_pct": 60.0,
                "wind_speed_10m_ms": None,
                "wind_speed_effective_ms": None,
                "direct_normal_irradiance_wm2": 700.0,
            },
        )


def test_post_home_risk_success_returns_forecast_centric_contract() -> None:
    """The route should serialize the new forecast-centric response contract."""

    app = create_app()
    app.dependency_overrides[get_risk_service] = lambda: SuccessfulRiskService()

    payload = {
        "sport": "SOCCER",
        "latitude": -33.847,
        "longitude": 151.067,
        "profile": "ADULT",
    }

    with TestClient(app) as client:
        response = client.post("/home/risk", json=payload)

    assert response.status_code == 200
    assert response.json() == {
        "request": {
            "sport": "SOCCER",
            "profile": "ADULT",
            "location": {
                "latitude": -33.847,
                "longitude": 151.067,
                "timezone": "Australia/Sydney",
            },
        },
        "forecast": [
            {
                "time_utc": "2026-03-09T00:00:00Z",
                "inputs": {
                    "air_temperature_c": 31.0,
                    "mean_radiant_temperature_c": 37.25,
                    "relative_humidity_pct": 62.0,
                    "wind_speed_10m_ms": 1.5,
                    "wind_speed_effective_ms": 1.02,
                    "direct_normal_irradiance_wm2": 700.0,
                },
                "heat_risk": {
                    "risk_level_interpolated": 1.2,
                    "t_medium": 34.5,
                    "t_high": 37.1,
                    "t_extreme": 39.2,
                    "recommendation": "Increase hydration & modify clothing",
                },
            },
            {
                "time_utc": "2026-03-09T01:00:00Z",
                "inputs": {
                    "air_temperature_c": 32.0,
                    "mean_radiant_temperature_c": 38.1,
                    "relative_humidity_pct": 61.0,
                    "wind_speed_10m_ms": 1.6,
                    "wind_speed_effective_ms": 1.09,
                    "direct_normal_irradiance_wm2": 740.0,
                },
                "heat_risk": {
                    "risk_level_interpolated": 1.4,
                    "t_medium": 34.5,
                    "t_high": 37.1,
                    "t_extreme": 39.2,
                    "recommendation": "Increase hydration & modify clothing",
                },
            },
        ],
    }


def test_post_home_risk_missing_latitude_returns_422() -> None:
    """FastAPI should reject requests missing required coordinates."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk",
            json={
                "sport": "SOCCER",
                "longitude": 151.067,
                "profile": "ADULT",
            },
        )

    assert response.status_code == 422


def test_post_home_risk_invalid_longitude_returns_422() -> None:
    """FastAPI should reject invalid longitude values."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk",
            json={
                "sport": "SOCCER",
                "latitude": -33.847,
                "longitude": 181.0,
                "profile": "ADULT",
            },
        )

    assert response.status_code == 422


def test_post_home_risk_invalid_sport_contract_returns_422() -> None:
    """The request schema should require the official pythermalcomfort sport name."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk",
            json={
                "sport": "soccer",
                "latitude": -33.847,
                "longitude": 151.067,
                "profile": "ADULT",
            },
        )

    assert response.status_code == 422


def test_post_home_risk_missing_profile_returns_422() -> None:
    """FastAPI should reject requests that omit the required audience profile."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk",
            json={
                "sport": "SOCCER",
                "latitude": -33.847,
                "longitude": 151.067,
            },
        )

    assert response.status_code == 422


def test_post_home_risk_invalid_profile_returns_422() -> None:
    """The request schema should restrict profile values to the public enum."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk",
            json={
                "sport": "SOCCER",
                "latitude": -33.847,
                "longitude": 151.067,
                "profile": "Adult",
            },
        )

    assert response.status_code == 422


def test_post_home_risk_weather_upstream_error_returns_502() -> None:
    """Weather provider failures should still map to 502 responses."""

    app = create_app()
    app.dependency_overrides[get_risk_service] = lambda: FailingRiskService()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk",
            json={
                "sport": "SOCCER",
                "latitude": -33.847,
                "longitude": 151.067,
                "profile": "ADULT",
            },
        )

    assert response.status_code == 502
    assert response.json() == {"detail": "Weather provider unavailable"}


def test_post_home_risk_missing_wind_returns_422_unknown_inputs() -> None:
    """Current-point missing inputs should surface the public field names."""

    app = create_app()
    app.dependency_overrides[get_risk_service] = lambda: MissingInputRiskService()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk",
            json={
                "sport": "SOCCER",
                "latitude": -33.847,
                "longitude": 151.067,
                "profile": "ADULT",
            },
        )

    assert response.status_code == 422
    assert response.json()["detail"]["unknown_inputs"] == ["wind_speed_10m_ms"]
