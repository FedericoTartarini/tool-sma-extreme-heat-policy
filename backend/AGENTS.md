# SMA backend

FastAPI, Pydantic v2, httpx, pythermalcomfort, uvicorn. Python 3.12, environment tool `uv`.

## Core rules (strict)

- Use `pythermalcomfort.models.sports_heat_stress_risk.sports_heat_stress_risk` directly. Model inputs are `tdb`, `tr`, `rh`, `vr`, `sport`. No custom risk scoring on top of its output.
- Compute `tr` from the MRT pipeline, not by setting `tr = tdb`: Open-Meteo `direct_normal_irradiance` as the radiation source, MRT via `pvlib` + `pythermalcomfort.models.solar_gain`. Globe temperature (`tg`) is out of scope and must not be introduced.
- Convert Open-Meteo `wind_speed_10m` to 1.1 m with `pythermalcomfort.utils.scale_wind_speed_log(..., round_output=True)` before the model call.
- Resolve the location timezone from coordinates in backend orchestration; do not require frontend `tz`.
- No assumptions before the model call: no clamping, no default fill, no input remapping beyond the approved MRT pipeline and wind-height scaling.
- If required weather or MRT inputs are missing or uncertain (`tdb`, `rh`, `wind`, `radiation`, `tr`), return `422` with `unknown_inputs` under `response.forecast[*].heat_risk`.
- Return pythermalcomfort output in `response.heat_risk` with original field names.

## Layers

`api/routes` request/response wiring only; `schemas` validation; `services` orchestration, cache, upstream sequencing; `clients` Open-Meteo calls; `calculators` pythermalcomfort invocation only; `core` config and error types. Routes only parse, validate and delegate.

## API contract

- Route `POST /home/risk`. Request requires `latitude` and `longitude`; `sport` is an official pythermalcomfort `Sports` enum name (e.g. `SOCCER`).
- Response: `request` (context including `sport`, `profile`, `location.timezone`) and `forecast` (hourly points with `time_utc`, `time_local`, explicit inputs, raw pythermalcomfort keys under `heat_risk`).
- snake_case only; no camelCase request keys, no legacy `data/meta` response keys. Validate schemas at boundaries; no implicit dict shapes in route handlers.
- Upstream weather data is untrusted: validate before model invocation. Upstream failures and timeouts return explicit, stable error shapes without secrets or internals.
- Tests: unit tests for calculators and services, API-level tests for route contracts, no network dependence.
