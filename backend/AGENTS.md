# AI Working Guide for SMA Backend

## Purpose and Scope
- This guide applies only to `backend/`.
- It extends the global rules in the repository root `AGENTS.md`.
- If a local and global rule conflict, follow the stricter rule and note it in handoff.
- Goal: preserve strict pythermalcomfort integration rules.

## Project Snapshot
- Stack: FastAPI, Pydantic v2, httpx, pythermalcomfort, uvicorn.
- Package/environment tool: `uv`.
- Python version: 3.12.

## Core Rules (Strict Mode)
- Use `pythermalcomfort.models.sports_heat_stress_risk.sports_heat_stress_risk` directly.
- Model inputs are `tdb`, `tr`, `rh`, `vr`, `sport`.
- Compute `tr` from the MRT pipeline, not by setting `tr = tdb`.
- Convert Open-Meteo `wind_speed_10m` to 1.1 m with `pythermalcomfort.utils.scale_wind_speed_log(..., round_output=True)` before model call.
- Apply a sport wind-speed floor after scaling: `vr = max(scaled_vr, Sports.<sport>.vr)`.
- Resolve the location timezone from coordinates in backend orchestration; do not require frontend `tz`.
- Use Open-Meteo `direct_normal_irradiance` as the radiation source and derive MRT with `pvlib` + `pythermalcomfort.models.solar_gain`.
- Globe temperature (`tg`) is out of scope and must not be introduced.
- Do not introduce assumptions before model call:
  - no clamping
  - no default fill
  - no business-side input remapping beyond the approved MRT pipeline, wind-height scaling, and sport default floor
- If required weather or MRT inputs are missing/uncertain (`tdb`, `rh`, `wind`, `radiation`, `tr`), return `422` with `unknown_inputs` under `response.forecast[*].heat_risk`.
- Return pythermalcomfort output in `response.heat_risk` with original field names.

## Engineering and Design Rules
- Keep routing thin: routes only parse/validate and delegate.
- Keep service orchestration deterministic and easy to test.
- Keep calculators focused on model invocation and minimal transformation.
- Use explicit error types and actionable error responses.
- Preserve backward-compatible API behavior unless a breaking change is explicitly requested.

## Architecture and Layer Rules
- `api/routes`: request/response wiring only.
- `schemas`: request/response validation.
- `services`: orchestration, cache, upstream sequencing.
- `clients`: Open-Meteo API calls.
- `calculators`: pythermalcomfort model invocation only.
- `core`: config and error types.

## API Contract Rules
- Preserve route: `POST /home/risk`.
- Request requires `latitude` and `longitude`.
- `sport` must be official pythermalcomfort `Sports` enum name (e.g. `SOCCER`).
- Response shape:
  - `heat_risk` -> raw pythermalcomfort output keys
  - `meta_data` -> context and source payload references, including `location.timezone` when resolved (no mapbox payload)
  - `forecast` -> UTC hourly points with `time_utc` and `risk_level_interpolated`
- API contract style is snake_case only; do not default to camelCase request keys or legacy `data/meta` response keys.
- Validate request/response schemas at boundaries; do not rely on implicit dict shapes in route handlers.

## Data and Error Handling Rules
- Treat upstream weather data as untrusted input and validate before model invocation.
- For upstream failures/timeouts, return explicit, stable error shapes with enough context for frontend handling.
- Do not leak secrets or environment-specific internals in error payloads.
- Keep logging structured and operationally useful; avoid noisy debug prints in committed code.

## Testing Expectations
- Add or update tests for any behavior or contract change.
- Prefer unit tests for calculators/services and API-level tests for route contracts.
- Keep tests deterministic; avoid network dependence in tests when mocks or fixtures are feasible.

## Validation Checklist Before Handoff
- `UV_CACHE_DIR=/tmp/uv-cache uv run ruff check .`
- `UV_CACHE_DIR=/tmp/uv-cache uv run pytest`
- Verify `uvicorn` starts locally.

## Out of Scope / Do Not Change
- No frontend changes unless explicitly requested.
- No cloud/deployment changes in this phase.
- No custom risk scoring formula on top of pythermalcomfort output.
