# tool-sma-extreme-heat-policy

Sports Medicine Australia extreme heat policy risk tool. `backend/` is a FastAPI service that runs pythermalcomfort's sports heat stress model over Open-Meteo forecasts; `frontend/` is a React 19 + Vite + Mantine SPA. Each half has its own `AGENTS.md` with the contracts that matter there.

- `frontend/` uses **pnpm**, `backend/` uses **uv**. Never use npm, yarn, pip or poetry.
- Frontend gate: `pnpm run ci` (lint, prettier check, vitest, build). Single test: `pnpm vitest run <file>`.
- Backend gate: `UV_CACHE_DIR=/tmp/uv-cache uv run ruff check .` and `UV_CACHE_DIR=/tmp/uv-cache uv run pytest`, then confirm `uvicorn` starts.
- User-facing text lives in `frontend/src/i18n/locales/*/translation.json`, never in components, hooks or stores.
- Env vars: placeholders only, documented in that half's README. Never commit secrets.
- No dependency upgrades, no cross-half changes, no kids/adults segmentation work unless explicitly requested.
