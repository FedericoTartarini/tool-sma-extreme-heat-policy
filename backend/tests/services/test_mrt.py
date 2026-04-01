from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

import pytest

from sma_extreme_heat_backend.clients.open_meteo import HourlyWeatherPoint
from sma_extreme_heat_backend.services.mrt import (
    build_mrt_dataframe,
    resolve_timezone_name,
)


def _next_utc_time(hour: int, minute: int = 0) -> datetime:
    """Return the next UTC timestamp used to keep MRT tests stable."""

    now = datetime.now(tz=UTC)
    candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=1)
    return candidate


def _build_points(*, start: datetime, radiation: list[float]) -> list[HourlyWeatherPoint]:
    """Create deterministic hourly weather points for MRT tests."""

    points: list[HourlyWeatherPoint] = []
    for offset, radiation_value in enumerate(radiation):
        timestamp = start + timedelta(hours=offset)
        points.append(
            HourlyWeatherPoint(
                time_utc=timestamp,
                tdb=30.0 + offset,
                rh=55.0 + offset,
                wind=1.5 + (offset * 0.1),
                radiation=radiation_value,
            )
        )
    return points


def test_resolve_timezone_name_returns_expected_zone() -> None:
    """Timezone resolution should match the expected IANA zone."""

    assert resolve_timezone_name(latitude=-33.847, longitude=151.067) == "Australia/Sydney"


def test_build_mrt_dataframe_daytime_produces_positive_delta_mrt_and_higher_tr() -> None:
    """Daytime radiation should increase MRT above dry-bulb air temperature."""

    points = _build_points(
        start=_next_utc_time(12),
        radiation=[800.0, 850.0, 900.0],
    )

    result = build_mrt_dataframe(
        points=points,
        latitude=0.0,
        longitude=0.0,
        timezone_name="UTC",
    )

    assert set(result.index.minute) == {0}
    assert (result["delta_mrt"] > 0).all()
    assert (result["tr"] > result["tdb"]).all()
    assert result["radiation"].tolist() == [800.0, 850.0, 900.0]


def test_build_mrt_dataframe_nighttime_clamps_elevation_and_keeps_delta_mrt_near_zero() -> None:
    """Nighttime inputs should clamp solar elevation to zero and avoid extra MRT load."""

    points = _build_points(
        start=_next_utc_time(0),
        radiation=[0.0, 0.0, 0.0],
    )

    result = build_mrt_dataframe(
        points=points,
        latitude=0.0,
        longitude=0.0,
        timezone_name="UTC",
    )

    assert result["elevation"].tolist() == [0.0, 0.0, 0.0]
    assert result["delta_mrt"].abs().max() == pytest.approx(0.0, abs=1e-6)
    assert (result["tr"] <= result["tdb"] + 1e-6).all()
    assert set(result.index.minute) == {0}


def test_build_mrt_dataframe_preserves_hourly_local_time_for_half_hour_timezone() -> None:
    """Provider-native Adelaide hourly points should stay on local hour boundaries."""

    points = _build_points(
        start=_next_utc_time(12, 30),
        radiation=[800.0, 850.0, 900.0],
    )

    result = build_mrt_dataframe(
        points=points,
        latitude=-34.9285,
        longitude=138.6007,
        timezone_name="Australia/Adelaide",
    )

    assert set(result.index.minute) == {0}
    assert set(result.index.tz_convert(UTC).minute) == {30}
    assert result["radiation"].tolist() == [800.0, 850.0, 900.0]


def test_build_mrt_dataframe_preserves_hourly_local_time_for_quarter_hour_timezone() -> None:
    """Provider-native Eucla hourly points should stay on local hour boundaries."""

    points = _build_points(
        start=_next_utc_time(15, 15),
        radiation=[800.0, 850.0, 900.0],
    )

    result = build_mrt_dataframe(
        points=points,
        latitude=-31.721,
        longitude=128.883,
        timezone_name="Australia/Eucla",
    )

    assert set(result.index.minute) == {0}
    assert set(result.index.tz_convert(UTC).minute) == {15}
    assert result["radiation"].tolist() == [800.0, 850.0, 900.0]


def test_build_mrt_dataframe_logs_structured_warning_for_negative_delta_mrt(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Negative MRT deltas should be logged with structured diagnostics."""

    points = _build_points(
        start=_next_utc_time(12),
        radiation=[800.0, 850.0, 900.0],
    )

    monkeypatch.setattr(
        "sma_extreme_heat_backend.services.mrt.solar_gain",
        lambda **_: {"delta_mrt": -0.25},
    )

    with caplog.at_level(logging.WARNING, logger="sma_extreme_heat_backend.services.mrt"):
        result = build_mrt_dataframe(
            points=points,
            latitude=0.0,
            longitude=0.0,
            timezone_name="UTC",
        )

    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.message == "Calculated negative delta_mrt values during MRT pipeline"
    assert record.count == len(result)
    assert record.min_delta_mrt == -0.25
    assert record.timezone == "UTC"
