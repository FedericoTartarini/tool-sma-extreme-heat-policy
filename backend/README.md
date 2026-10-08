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
Set `CORS_ORIGINS` to the production frontend origin. If you need to allow
Netlify preview or branch deploy URLs, set `CORS_ORIGIN_REGEX` to a strict regex
such as `^https://([a-z0-9-]+--)?sports-heat-tool\.netlify\.app$`.
`HTTP_TIMEOUT_SECONDS` controls the per-attempt Open-Meteo request timeout and
defaults to `3` seconds.

### Run locally

```bash
uv run uvicorn sma_extreme_heat_backend.main:app --reload --port 8000
```

## Local Checks

```bash
uv run ruff check .
uv run pytest
```

## Cloud Build And Cloud Run Deployment

Backend deployment logic lives in `backend/cloudbuild.yaml`. Cloud Build
triggers should use that config file, not Dockerfile autodetection.

The Cloud Build pipeline first resolves and validates the required deployment
substitutions, then runs backend linting and tests before any image is built. If
those checks pass, it builds the image from `backend/Dockerfile`, pushes that
exact image to Artifact Registry, and deploys the same image digest to Cloud
Run.

This explicit config is preferred over Dockerfile autodetection because it keeps
the deployment steps reproducible, avoids hidden builder defaults, validates
required substitutions before deployment work begins, and makes the lint/test
gates part of the release path.

Trigger settings:

- Branches: `development` for dev/staging, `main` for production.
- Included files: `backend/**`.
- Config file path: `backend/cloudbuild.yaml`.
- Production triggers should require manual approval.

Required trigger substitutions:

- `_SERVICE_NAME`
- `_RUN_REGION`
- `_ARTIFACT_REGION`
- `_ARTIFACT_REPOSITORY`

Cloud Run owns runtime settings such as `CORS_ORIGINS` and
`CORS_ORIGIN_REGEX`.

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
  Must be one of `ADULT`, `UNDER_10`, `AGE_10_13`, or `AGE_14_17`. All profiles
  currently use the same pythermalcomfort model path; the field is included to
  preserve the public contract for future profile-specific behaviour.

Example request:

```json
{
  "sport": "SOCCER",
  "latitude": -33.847,
  "longitude": 151.067,
  "profile": "AGE_10_13"
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
    "profile": "AGE_10_13",
    "location": {
      "latitude": -33.847,
      "longitude": 151.067,
      "timezone": "Australia/Sydney"
    }
  },
  "forecast": [
    {
      "time_utc": "2026-03-09T00:00:00Z",
      "time_local": "2026-03-09T11:00:00+11:00",
      "inputs": {
        "tdb": 31.0,
        "tr": 37.25,
        "rh": 62.0,
        "v_z1": 1.5,
        "sol_radiation_dir": 525.0
      },
      "heat_risk": {
        "risk_level_interpolated": 1.94,
        "t_medium": 34.5,
        "t_high": 37.1,
        "t_extreme": 39.2,
        "recommendation": "Increase hydration & modify clothing"
      }
    }
  ],
  "daily_weather": [
    {
      "date": "2026-03-09",
      "sunrise_local": "06:30",
      "sunset_local": "19:45",
      "uv_index_max": 8.2,
      "precip_prob_max_pct": 70.0,
      "cumulative_rainfall_mm": 1.5,
      "max_temp_c": 32.4,
      "min_temp_c": 21.3,
      "max_temp_time_local": "14:00",
      "min_temp_time_local": "05:00",
      "humidity_at_max_pct": 48.0,
      "humidity_at_min_pct": 88.0,
      "uv_index_max_time_local": "13:00",
      "avg_wind_speed_ms": 2.1
    }
  ]
}
```

## Risk Flow

1. Fetch Open-Meteo weather with hourly:
   - `temperature_2m`
   - `relative_humidity_2m`
   - `wind_speed_10m`
   - `direct_normal_irradiance`
   - `uv_index` (optional, weather details only)
   - and daily:
   - `sunrise`
   - `sunset`
   - `precipitation_probability_max`
   - `precipitation_sum`
   - `timezone=<resolved IANA timezone>`
   - `wind_speed_unit=ms`
2. Validate provider units at runtime:
   - hourly: `temperature_2m: °C`, `relative_humidity_2m: %`, `wind_speed_10m: m/s`, `direct_normal_irradiance: W/m²`
   - daily: `precipitation_probability_max: %`, `precipitation_sum: mm`
   - hourly `uv_index` is not unit-validated or required: a missing or misaligned
     series is logged at warning level and only clears the UV fields in
     `daily_weather`.
   - daily provider data is non-fatal; hourly-derived details and hourly risk
     calculation continue unchanged. Provider fields feed outputs as
     `sunrise` → `sunrise_local`, `sunset` → `sunset_local`,
     `precipitation_probability_max` → `precip_prob_max_pct`, and
     `precipitation_sum` → `cumulative_rainfall_mm`:
     - each daily series is checked on its own: a missing or misaligned
       series, or an unexpected or missing unit for
       `precipitation_probability_max` / `precipitation_sum`, is logged at
       warning level and only sets that output to `null` for every day.
     - a missing `daily` block or `daily.time` series is logged at warning
       level and leaves those four outputs `null` for every day.
     - a daily row with an invalid date is logged and skipped, and that row
       is omitted. It does not clear outputs for any day built from hours.
     - an invalid sunrise or sunset is logged and only clears that output.
       A non-numeric or non-finite `precipitation_probability_max` or
       `precipitation_sum` value sets only that output to `null` without
       logging.
   - Every metric inside a `daily_weather` row is nullable. Missing values are
     returned as `null`; the keys are always present.
   - `daily_weather` also includes calendar-day temperature, humidity, UV max
     (value and time), and average wind derived from the full provider hourly
     series (not the risk-trimmed `forecast[]` window).
   - When multiple hours share the same max/min temperature or max UV index,
     the earliest local hour that day is used for the reported time.
3. Resolve the IANA timezone from `latitude` and `longitude`, then require the
   provider response to echo back the same timezone.
4. Keep hourly records where `time >= now_utc - 1h` inside the 7-day forecast window.
5. Convert the retained rows into the resolved local timezone.
6. Drop rows missing `tdb`.
7. Build MRT values with `pvlib` + `pythermalcomfort` on the provider-native hourly points:
   - compute solar elevation for each local timestamp
   - clamp negative solar elevations to `0`
   - derive `sol_radiation_dir = direct_normal_irradiance * 0.75`
   - compute `delta_mrt` with `pythermalcomfort.models.solar_gain`
   - derive `tr = tdb + delta_mrt`
8. Convert `v_z1` to the model's required 1.1 m wind speed using
   `pythermalcomfort.utils.scale_wind_speed_log(...)`.
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
- Upstream weather failures return `502` with:
  `{"detail": "Weather provider unavailable", "error_code": "weather_provider_unavailable"}`.
- Retryable Open-Meteo failures are retried once after `0.25` seconds; each
  attempt uses `HTTP_TIMEOUT_SECONDS`.
- Future forecast rows with missing inputs are skipped instead of failing the request.

## Notes

- Mean radiant temperature is not assumed to equal dry-bulb air temperature.
  The backend derives MRT through the solar-gain pipeline and returns the final
  `tr` input in each forecast point, matching PyThermalComfort naming.
- Each forecast point exposes both `time_utc` and `time_local`; `time_utc` is the
  canonical instant, while `time_local` is the location-local display time.
