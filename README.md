# SMA Extreme Heat Policy Tool

[![CI](https://github.com/FedericoTartarini/tool-sma-extreme-heat-policy/actions/workflows/ci.yml/badge.svg)](https://github.com/FedericoTartarini/tool-sma-extreme-heat-policy/actions/workflows/ci.yml)

A location-aware web tool that helps athletes, coaches, and sporting organisations understand forecast heat-stress risk and take evidence-based precautions.

[Open the live tool](https://sports-heat-tool.sydney.edu.au/) · [Getting started](#getting-started) · [Project structure](#project-structure) · [Development](#development) · [API](#api)

## Overview

The SMA Extreme Heat Policy Tool combines local weather forecasts with the Sports Medicine Australia heat-risk model. Users select a location and sport to see the current risk level, a seven-day forecast, and practical recommendations for reducing heat stress.

> **Important:** This tool provides general information for educational purposes and does not provide medical advice. See the live tool's [terms and medical disclaimer](https://sports-heat-tool.sydney.edu.au/about).

The application:

- retrieves location-aware forecast data from [Open-Meteo](https://open-meteo.com/);
- derives mean radiant temperature and sport-specific heat-stress risk with `pvlib` and [`pythermalcomfort`](https://github.com/CenterForTheBuiltEnvironment/pythermalcomfort);
- presents risk levels, forecast charts, and recommended actions in a responsive web interface; and
- keeps weather retrieval and risk calculations in the backend so the frontend consumes a stable API contract.

## How it works

```text
Location + sport
      │
      ▼
React frontend ──► FastAPI backend ──► Open-Meteo forecast
                         │
                         ├─► mean radiant temperature
                         └─► sports heat-stress model
                                      │
                                      ▼
                         risk forecast + recommendations
```

## Getting started

### Prerequisites

- Python 3.12
- [`uv`](https://docs.astral.sh/uv/)
- Node.js 24 LTS
- pnpm 11.5.2 (through Corepack)
- A free [Mapbox public access token](https://account.mapbox.com/access-tokens/)

The commands below use macOS/Linux shell syntax. In Windows PowerShell, replace `cp <source> <destination>` with `Copy-Item <source> <destination>`.

### 1. Clone the repository

```bash
git clone https://github.com/FedericoTartarini/tool-sma-extreme-heat-policy.git
cd tool-sma-extreme-heat-policy
```

### 2. Start the backend

```bash
cd backend
uv sync
cp .env.example .env
uv run uvicorn sma_extreme_heat_backend.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`, with interactive documentation at `http://localhost:8000/docs`. The default environment file already allows requests from the local frontend.

### 3. Start the frontend

From the repository root, in a second terminal:

```bash
cd frontend
corepack enable
pnpm install
cp .env.example .env.local
```

Set your Mapbox public token in `frontend/.env.local`:

```dotenv
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
VITE_API_BASE_URL=http://localhost:8000
```

Then start the development server:

```bash
pnpm dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). If Vite selects another port, follow the CORS guidance below.

### Troubleshooting

- **Location search is unavailable:** confirm `VITE_MAPBOX_ACCESS_TOKEN` contains a valid public token, then restart the frontend after changing `.env.local`.
- **The browser reports a CORS error:** confirm the frontend is running at `http://localhost:5173` and that `backend/.env` includes that URL in `CORS_ORIGINS`.
- **Vite selects a port other than 5173:** free port 5173 and run `pnpm dev --port 5173 --strictPort`, or add Vite's selected URL to `CORS_ORIGINS` in `backend/.env` and restart the backend.
- **Backend port 8000 is already in use:** stop the process using the port, or choose another backend port and update `VITE_API_BASE_URL` in `frontend/.env.local`.
- **Weather requests fail:** confirm the backend has internet access and can reach Open-Meteo.

## Project structure

```text
.
├── backend/                 # FastAPI service and heat-risk pipeline
│   ├── src/
│   │   └── sma_extreme_heat_backend/
│   │       ├── api/         # HTTP routes
│   │       ├── calculators/ # pythermalcomfort integration
│   │       ├── clients/     # Weather-provider client
│   │       ├── core/        # Configuration and application errors
│   │       ├── schemas/     # Request and response contracts
│   │       └── services/    # Forecast, MRT, and risk orchestration
│   └── tests/               # Backend test suite
├── frontend/                # React, TypeScript, and Vite application
│   ├── public/              # Static assets and PWA metadata
│   └── src/
│       ├── api/             # Backend and Mapbox adapters
│       ├── app/             # Application shell and layout
│       ├── components/      # Reusable UI components
│       ├── domain/          # Types and heat-risk rules
│       ├── hooks/           # Reusable application hooks
│       ├── i18n/            # Localised user-facing copy
│       ├── pages/           # Route-level pages
│       └── store/           # Zustand state stores
└── .github/workflows/       # Continuous integration
```

More detailed documentation is available in the [backend guide](backend/README.md) and [frontend guide](frontend/README.md).

## Development

Run the checks for the area you change before opening a pull request.

### Backend

```bash
cd backend
uv run ruff check .
uv run pytest
```

### Frontend

```bash
cd frontend
pnpm run lint:ci
pnpm run test:ci
pnpm run build
```

To run the repository's pre-commit hooks across all files:

```bash
uvx pre-commit run --all-files
```

## API

The frontend uses `POST /home/risk` to request a forecast. A request includes a sport, profile, latitude, and longitude:

```json
{
  "sport": "SOCCER",
  "profile": "ADULT",
  "latitude": -33.847,
  "longitude": 151.067
}
```

The response contains the resolved location context and hourly forecast points with weather inputs, local and UTC timestamps, heat-risk thresholds, and recommendations. See the [backend API documentation](backend/README.md#api) for the full contract.

## Scientific basis

The tool is based on:

- [Sports Medicine Australia Extreme Heat Policy](https://sma.org.au/resources/policies-and-guidelines/hot-weather/)
- Tartarini, F. et al. (2025), [_A modified Sports Medicine Australia extreme heat policy and web tool_](https://doi.org/10.1016/j.jsams.2025.03.006), _Journal of Science and Medicine in Sport_

## Contributing

Issues and pull requests are welcome. Keep changes focused, include tests for behaviour changes, and make sure the relevant backend or frontend checks pass before requesting review.
