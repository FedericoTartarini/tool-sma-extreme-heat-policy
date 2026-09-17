# tool-sma-extreme-heat-policy

Sports Medicine Australia extreme heat policy risk tool. `backend/` is a FastAPI service that runs pythermalcomfort's sports heat stress model over Open-Meteo forecasts; `frontend/` is a React 19 + Vite + Mantine SPA. Each half has its own `AGENTS.md` with its toolchain, quality gate and domain contracts: read it before changing files there.

- A task changes one half; the gate in that half's `AGENTS.md` passes before handoff.
- Dependency versions stay as pinned. Upgrades, cross-half changes and kids/adults segmentation happen only on explicit request.
- Env vars are documented in that half's README with placeholder values. Real secrets stay out of git.
