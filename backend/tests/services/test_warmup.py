from __future__ import annotations

import logging
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from sma_extreme_heat_backend import main
from sma_extreme_heat_backend.services import warmup


def test_warm_up_models_runs_both_models_without_error() -> None:
    warmup.warm_up_models()


def test_warm_up_input_is_hot_enough_to_run_phs() -> None:
    # Below 23 °C the model returns risk 1 without running PHS, so nothing would compile.
    assert warmup.WARM_UP_INPUT.tdb >= 23.0


def test_app_startup_warms_up_models_before_serving() -> None:
    with patch.object(main, "warm_up_models_safely") as warm_up, TestClient(main.create_app()):
        warm_up.assert_called_once_with()


def test_warm_up_failure_is_logged_and_does_not_stop_startup(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with (
        patch.object(warmup, "warm_up_models", side_effect=RuntimeError("numba failed")),
        caplog.at_level(logging.ERROR, logger="sma_extreme_heat_backend.services.warmup"),
        TestClient(main.create_app()) as client,
    ):
        assert client.get("/health/ready").status_code == 200

    assert "Model warm-up failed" in caplog.text
