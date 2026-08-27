from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from sma_extreme_heat_backend.api.routes import get_risk_service
from sma_extreme_heat_backend.core.errors import ModelInputUnavailableError, WeatherProviderError
from sma_extreme_heat_backend.main import create_app
from sma_extreme_heat_backend.schemas.batch import (
    BATCH_RISK_LOCATION_MAX,
    BatchRiskLocationResult,
    BatchRiskLocationStatus,
    BatchRiskRequest,
    BatchRiskRequestSummary,
    BatchRiskResponse,
)
from sma_extreme_heat_backend.schemas.home import (
    ForecastHeatRisk,
    ForecastInputs,
    ForecastPoint,
    LocationSummary,
    RequestSummary,
    RiskRequest,
    RiskResponse,
)
from sma_extreme_heat_backend.services.batch_summary import (
    get_today_max_risk_level_interpolated,
)

VALID_PROFILES = ("ADULT", "UNDER_10", "AGE_10_13", "AGE_14_17")
VALID_SPORTS = ("SOCCER", "CROQUET")
SYDNEY_LAT = -33.847
SYDNEY_LNG = 151.067
MELBOURNE_LAT = -37.813
MELBOURNE_LNG = 144.963


def _successful_risk_response(*, latitude: float, longitude: float) -> RiskResponse:
    return RiskResponse(
        request=RequestSummary(
            sport="SOCCER",
            profile="ADULT",
            location=LocationSummary(
                latitude=latitude,
                longitude=longitude,
                timezone="Australia/Sydney"
                if abs(longitude - SYDNEY_LNG) < 0.001
                else "Australia/Melbourne",
            ),
        ),
        forecast=[
            ForecastPoint(
                time_utc="2026-03-09T00:00:00Z",
                time_local="2026-03-09T11:00:00+11:00",
                inputs=ForecastInputs(
                    air_temperature_c=31.0,
                    mean_radiant_temperature_c=37.25,
                    relative_humidity_pct=62.0,
                    wind_speed_10m_ms=1.5,
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
                time_local="2026-03-09T12:00:00+11:00",
                inputs=ForecastInputs(
                    air_temperature_c=32.0,
                    mean_radiant_temperature_c=38.1,
                    relative_humidity_pct=61.0,
                    wind_speed_10m_ms=1.6,
                    direct_normal_irradiance_wm2=740.0,
                ),
                heat_risk=ForecastHeatRisk(
                    risk_level_interpolated=1.6,
                    t_medium=34.5,
                    t_high=37.1,
                    t_extreme=39.2,
                    recommendation="Increase hydration & modify clothing",
                ),
            ),
        ],
    )


class BatchRiskServiceStub:
    """Route test double that simulates mixed batch outcomes."""

    async def calculate_home_risk(self, payload: RiskRequest) -> RiskResponse:
        if abs(payload.longitude - MELBOURNE_LNG) < 0.001:
            raise WeatherProviderError()
        return _successful_risk_response(
            latitude=payload.latitude,
            longitude=payload.longitude,
        )

    async def calculate_home_risk_batch(
        self,
        payload: BatchRiskRequest,
    ) -> BatchRiskResponse:
        locations: list[BatchRiskLocationResult] = []
        for location in payload.locations:
            try:
                response = await self.calculate_home_risk(
                    RiskRequest(
                        sport=payload.sport,
                        latitude=location.latitude,
                        longitude=location.longitude,
                        profile=payload.profile,
                    )
                )
            except WeatherProviderError:
                locations.append(
                    BatchRiskLocationResult(
                        latitude=location.latitude,
                        longitude=location.longitude,
                        timezone="Australia/Melbourne",
                        status=BatchRiskLocationStatus.ERROR,
                        error_code="weather_provider_unavailable",
                        detail="Weather provider unavailable",
                    )
                )
                continue
            except ModelInputUnavailableError as exc:
                locations.append(
                    BatchRiskLocationResult(
                        latitude=location.latitude,
                        longitude=location.longitude,
                        timezone="Australia/Sydney",
                        status=BatchRiskLocationStatus.ERROR,
                        error_code="unknown_inputs",
                        detail=str(exc.detail["message"]),
                    )
                )
                continue

            current_point = response.forecast[0]
            locations.append(
                BatchRiskLocationResult(
                    latitude=location.latitude,
                    longitude=location.longitude,
                    timezone=response.request.location.timezone,
                    status=BatchRiskLocationStatus.OK,
                    current_risk_level_interpolated=current_point.heat_risk.risk_level_interpolated,
                    today_max_risk_level_interpolated=get_today_max_risk_level_interpolated(
                        response.forecast
                    ),
                    current_time_local=current_point.time_local,
                )
            )

        return BatchRiskResponse(
            request=BatchRiskRequestSummary(
                sport=payload.sport,
                profile=payload.profile,
            ),
            locations=locations,
        )


@pytest.mark.parametrize("sport", VALID_SPORTS)
@pytest.mark.parametrize("profile", VALID_PROFILES)
def test_post_home_risk_batch_success_returns_summary_contract(
    profile: str,
    sport: str,
) -> None:
    """The batch route should serialize the dashboard summary contract."""

    app = create_app()
    app.dependency_overrides[get_risk_service] = lambda: BatchRiskServiceStub()

    payload = {
        "sport": sport,
        "profile": profile,
        "locations": [
            {"latitude": SYDNEY_LAT, "longitude": SYDNEY_LNG},
        ],
    }

    with TestClient(app) as client:
        response = client.post("/home/risk/batch", json=payload)

    assert response.status_code == 200
    assert response.json() == {
        "request": {
            "sport": sport,
            "profile": profile,
        },
        "locations": [
            {
                "latitude": SYDNEY_LAT,
                "longitude": SYDNEY_LNG,
                "timezone": "Australia/Sydney",
                "status": "ok",
                "current_risk_level_interpolated": 1.2,
                "today_max_risk_level_interpolated": 1.6,
                "current_time_local": "2026-03-09T11:00:00+11:00",
                "error_code": None,
                "detail": None,
            }
        ],
    }


def test_post_home_risk_batch_partial_failure_returns_200() -> None:
    """A valid batch request should return 200 even when one location fails."""

    app = create_app()
    app.dependency_overrides[get_risk_service] = lambda: BatchRiskServiceStub()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk/batch",
            json={
                "sport": "SOCCER",
                "profile": "ADULT",
                "locations": [
                    {"latitude": SYDNEY_LAT, "longitude": SYDNEY_LNG},
                    {"latitude": MELBOURNE_LAT, "longitude": MELBOURNE_LNG},
                ],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["locations"][0]["status"] == "ok"
    assert body["locations"][1] == {
        "latitude": MELBOURNE_LAT,
        "longitude": MELBOURNE_LNG,
        "timezone": "Australia/Melbourne",
        "status": "error",
        "current_risk_level_interpolated": None,
        "today_max_risk_level_interpolated": None,
        "current_time_local": None,
        "error_code": "weather_provider_unavailable",
        "detail": "Weather provider unavailable",
    }


def test_post_home_risk_batch_empty_locations_returns_422() -> None:
    """An empty locations array should be rejected."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk/batch",
            json={
                "sport": "SOCCER",
                "profile": "ADULT",
                "locations": [],
            },
        )

    assert response.status_code == 422


def test_post_home_risk_batch_more_than_max_locations_returns_422() -> None:
    """The batch schema should enforce the dashboard location cap."""

    app = create_app()
    locations = [
        {"latitude": -33.0 - (index * 0.01), "longitude": 151.0 + (index * 0.01)}
        for index in range(BATCH_RISK_LOCATION_MAX + 1)
    ]

    with TestClient(app) as client:
        response = client.post(
            "/home/risk/batch",
            json={
                "sport": "SOCCER",
                "profile": "ADULT",
                "locations": locations,
            },
        )

    assert response.status_code == 422


def test_post_home_risk_batch_invalid_sport_returns_422() -> None:
    """The batch request should require official pythermalcomfort sport names."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk/batch",
            json={
                "sport": "soccer",
                "profile": "ADULT",
                "locations": [{"latitude": SYDNEY_LAT, "longitude": SYDNEY_LNG}],
            },
        )

    assert response.status_code == 422


def test_post_home_risk_batch_invalid_longitude_returns_422() -> None:
    """Invalid coordinates should be rejected before batch processing."""

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/home/risk/batch",
            json={
                "sport": "SOCCER",
                "profile": "ADULT",
                "locations": [{"latitude": SYDNEY_LAT, "longitude": 181.0}],
            },
        )

    assert response.status_code == 422
