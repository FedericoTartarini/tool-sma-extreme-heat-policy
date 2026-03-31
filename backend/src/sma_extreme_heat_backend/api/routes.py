from typing import Annotated

from fastapi import APIRouter, Depends

from sma_extreme_heat_backend.schemas.home import RiskRequest, RiskResponse
from sma_extreme_heat_backend.services.risk_service import RiskService, get_risk_service

router = APIRouter()


@router.get("/health/live", tags=["health"])
async def health_live() -> dict[str, str]:
    """Return a basic liveness signal for process checks."""

    return {"status": "ok"}


@router.get("/health/ready", tags=["health"])
async def health_ready() -> dict[str, str]:
    """Return a basic readiness signal for deployment checks."""

    return {"status": "ready"}


@router.post("/home/risk", response_model=RiskResponse, tags=["home"])
async def calculate_home_risk(
    payload: RiskRequest,
    risk_service: Annotated[RiskService, Depends(get_risk_service)],
) -> RiskResponse:
    """Calculate the forecast-centric home heat-risk response."""

    return await risk_service.calculate_home_risk(payload)
