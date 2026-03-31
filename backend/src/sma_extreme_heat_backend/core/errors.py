from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base application error with an HTTP status code and response-safe detail."""

    def __init__(self, status_code: int, detail: Any) -> None:
        """Store the status code and serializable detail returned by the API layer."""

        super().__init__(str(detail))
        self.status_code = status_code
        self.detail = detail


class UpstreamServiceError(AppError):
    """Base error for failed upstream dependencies."""

    def __init__(self, detail: str) -> None:
        """Normalize upstream failures into the shared 502 application error shape."""

        super().__init__(status_code=502, detail=detail)


class WeatherProviderError(UpstreamServiceError):
    """Raised when Open-Meteo cannot provide the required weather payload."""

    def __init__(self, detail: str = "Weather provider unavailable") -> None:
        """Build the stable weather-provider error exposed to API callers."""

        super().__init__(detail=detail)


class RiskCalculationError(AppError):
    """Raised when pythermalcomfort or MRT calculations fail unexpectedly."""

    def __init__(self, detail: str = "Risk calculation failed") -> None:
        """Wrap unexpected model/calculation failures in the shared 500 error shape."""

        super().__init__(status_code=500, detail=detail)


class InvalidSportError(AppError):
    """Raised when the request references an unsupported pythermalcomfort sport."""

    def __init__(self, sport: str, allowed_sports: list[str]) -> None:
        """Expose the invalid sport together with the supported pythermalcomfort names."""

        super().__init__(
            status_code=422,
            detail={
                "message": "sport must match a pythermalcomfort Sports enum name",
                "sport": sport,
                "allowed_sports": allowed_sports,
            },
        )


class ModelInputUnavailableError(AppError):
    """Raised when the current forecast point lacks required model inputs."""

    def __init__(self, unknown_inputs: list[str], available_inputs: dict[str, Any]) -> None:
        """Return the missing and available inputs for an unusable forecast candidate row."""

        super().__init__(
            status_code=422,
            detail={
                "message": "Required model inputs are missing or uncertain",
                "unknown_inputs": unknown_inputs,
                "available_inputs": available_inputs,
            },
        )
