# SMA backend

FastAPI, Pydantic v2, httpx, pythermalcomfort, uvicorn. Python 3.12, environment tool `uv`.

## Gate

Before handoff, from `backend/`:

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run ruff check .
UV_CACHE_DIR=/tmp/uv-cache uv run pytest
UV_CACHE_DIR=/tmp/uv-cache uv run uvicorn sma_extreme_heat_backend.main:app --port 8000
```

All three pass when ruff and pytest exit 0 and `GET /health/ready` on the running server returns 200, which is what CI checks.

## Core rules (strict)

- Risk is the output of `pythermalcomfort.models.sports_heat_stress_risk.sports_heat_stress_risk`, called directly with `tdb`, `tr`, `rh`, `vr`, `sport` and returned unscored and unadjusted.
- `tr` is mean radiant temperature from the MRT pipeline: Open-Meteo `direct_normal_irradiance` as the radiation source, MRT via `pvlib` + `pythermalcomfort.models.solar_gain`. `tr = tdb` and globe temperature (`tg`) are out of scope.
- Convert Open-Meteo `wind_speed_10m` to 1.1 m with `pythermalcomfort.utils.scale_wind_speed_log(..., round_output=True)` before the model call.
- The location timezone is resolved from coordinates inside backend orchestration.
- Inputs reach the model exactly as the pipeline produced them: the MRT pipeline and wind-height scaling are the only transforms, with no clamping, default fill or remapping.
- Required forecast inputs are `tdb`, `rh`, `v_z1`, `sol_radiation_dir`, `tr`. Forecast rows missing any of them are skipped; if no complete row remains, return `422` with `detail.unknown_inputs` and `detail.available_inputs` from the earliest candidate row.
- Return pythermalcomfort output in `response.heat_risk` with original field names.

## Layers

`api/routes` request/response wiring only; `schemas` validation; `services` orchestration, cache, upstream sequencing; `clients` Open-Meteo calls; `calculators` pythermalcomfort invocation only; `core` config and error types. Routes only parse, validate and delegate.

## API contract

- Route `POST /home/risk`. Request is `sport`, `latitude`, `longitude`, `profile`; `sport` is an official pythermalcomfort `Sports` enum name (e.g. `SOCCER`).
- Response: `request` (context including `sport`, `profile`, `location.timezone`) and `forecast` (hourly points with `time_utc`, `time_local`, explicit inputs, raw pythermalcomfort keys under `heat_risk`).
- Keys are snake_case at both boundaries. Routes take and return Pydantic schemas.
- Upstream weather data is untrusted: validate before model invocation. Upstream failures and timeouts return explicit, stable error shapes without secrets or internals.
- Tests: unit tests for calculators and services, API-level tests for route contracts, all running without network.
