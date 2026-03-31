# SMA Extreme Heat Backend

FastAPI backend for the SMA Extreme Heat Policy tool.

## Architecture At A Glance

- `src/sma_extreme_heat_backend/api/routes.py`
  HTTP route wiring only.
- `src/sma_extreme_heat_backend/schemas`
  Request and response contracts.
- `src/sma_extreme_heat_backend/services`
  Weather orchestration, MRT enrichment, caching, and forecast shaping.
- `src/sma_extreme_heat_backend/clients`
  Open-Meteo HTTP access and payload validation.
- `src/sma_extreme_heat_backend/calculators`
  pythermalcomfort adapter layer only.
- `src/sma_extreme_heat_backend/core`
  Settings and typed application errors.

This split is intentional: routes stay thin, IO stays isolated, and the risk
pipeline remains testable without HTTP or FastAPI.

## Requirements

- Python 3.12
- `uv`

## How to get started locally

### Setup
To complete the following action you need to have UV installed on your computer.
```bash
cd backend
uv sync
```

### Environment
Copy `backend/.env.example` to `backend/.env` using the command `cp .env.example .env`.

### Run locally
```bash
uv run uvicorn sma_extreme_heat_backend.main:app --reload --port 8000
```

## Local Checks

```bash
uv run ruff check .
uv run pytest
```

## Pre-commit

The repository root contains `.pre-commit-config.yaml` with:

- Ruff format + check for `backend/**/*.py`
- Prettier write hook for `frontend/**`

After installing `pre-commit` locally, run:

```bash
pre-commit install
pre-commit run --all-files
```

## API

### `POST /home/risk`

Request body:

- `sport: string`
  Must exactly match a pythermalcomfort `Sports` enum name, for example `SOCCER`.
- `latitude: number`
  Range `[-90, 90]`.
- `longitude: number`
  Range `[-180, 180]`.
- `profile: string`
  Must be `ADULT` or `KIDS`. Both profiles currently use the same pythermalcomfort
  model path; the field is included to reserve the public contract for future
  profile-specific behaviour.

Example request:

```json
{
  "sport": "SOCCER",
  "latitude": -33.847,
  "longitude": 151.067,
  "profile": "ADULT"
}
```

### Response contract

The API is forecast-centric:

- `forecast[0]` is the earliest complete forecast point used by the frontend gauge and recommendation sections.
- Later `forecast[]` entries drive the charts.
- There is no separate top-level `heat_risk` or `meta_data` block.

Example response:

```json
{
  "request": {
    "sport": "SOCCER",
    "profile": "ADULT",
    "location": {
      "latitude": -33.847,
      "longitude": 151.067,
      "timezone": "Australia/Sydney"
    }
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
        "direct_normal_irradiance_wm2": 700.0
      },
      "heat_risk": {
        "risk_level_interpolated": 1.94,
        "t_medium": 34.5,
        "t_high": 37.1,
        "t_extreme": 39.2,
        "recommendation": "Increase hydration & modify clothing"
      }
    }
  ]
}
```

## Risk Flow

1. Fetch Open-Meteo hourly weather with:
   - `temperature_2m`
   - `relative_humidity_2m`
   - `wind_speed_10m`
   - `direct_normal_irradiance`
   - `timezone=GMT`
   - `wind_speed_unit=ms`
2. Validate provider units at runtime:
   - `temperature_2m: °C`
   - `relative_humidity_2m: %`
   - `wind_speed_10m: m/s`
   - `direct_normal_irradiance: W/m²`
3. Resolve the IANA timezone from `latitude` and `longitude`.
4. Keep hourly records where `time >= now_utc - 1h` inside the 7-day forecast window.
5. Convert the retained rows into the resolved local timezone.
6. Drop rows missing `tdb`, resample to `30min`, and interpolate numeric weather fields.
7. Build MRT values with `pvlib` + `pythermalcomfort`:
   - compute solar elevation for each local timestamp
   - clamp negative solar elevations to `0`
   - derive `dni = direct_normal_irradiance * 0.75`
   - compute `delta_mrt` with `pythermalcomfort.models.solar_gain`
   - derive `tr = tdb + delta_mrt`
8. Convert `wind_speed_10m_ms` to `wind_speed_effective_ms` using
   `pythermalcomfort.utils.scale_wind_speed_log(...)`, then apply the sport floor
   with `max(scaled_vr, Sports.<sport>.vr)`.
9. Run `sports_heat_stress_risk` for each complete forecast row.
10. Skip incomplete rows and treat the earliest complete row as `forecast[0]`.
11. Return `422` only when no complete forecast row exists; the error payload is derived
    from the earliest candidate row.

## Caching

- The risk service keeps an in-memory TTL cache keyed by:
  `sport + profile + latitude + longitude`
- Requests from different users will reuse cached results only when they hit the
  same backend process.
- The cache is not shared across multiple server instances.

## Validation And Errors

- Invalid request bodies return `422`.
- Missing required inputs return `422` only when the backend cannot build any complete
  forecast point; in that case the error payload uses the earliest candidate row and includes:
  - `unknown_inputs`
  - `available_inputs`
- Upstream weather failures return `502`.
- Future forecast rows with missing inputs are skipped instead of failing the request.

## Notes

- Mean radiant temperature is not assumed to equal dry-bulb air temperature.
  The backend derives MRT through the solar-gain pipeline and returns the final
  `mean_radiant_temperature_c` in each forecast point.
- The public response does not expose the raw Open-Meteo payload.
