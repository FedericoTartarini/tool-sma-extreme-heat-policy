from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from sma_extreme_heat_backend import main
from sma_extreme_heat_backend.services.warmup import warm_up_models


def test_warm_up_models_runs_both_models_without_error() -> None:
    warm_up_models()


def test_app_startup_warms_up_models_before_serving() -> None:
    with patch.object(main, "warm_up_models") as warm_up, TestClient(main.create_app()):
        warm_up.assert_called_once_with()
