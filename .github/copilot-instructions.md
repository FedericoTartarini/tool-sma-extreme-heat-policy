# GitHub Copilot instructions for tool-sma-extreme-heat-policy

The Sports Heat Tool: a FastAPI backend (`backend/`) that runs pythermalcomfort's
`sports_heat_stress_risk` over Open-Meteo forecasts, and a React 19 + Vite + Mantine
frontend (`frontend/`). The contracts live in `AGENTS.md`, `backend/AGENTS.md` and
`frontend/AGENTS.md`. Review against them.

Review focus
- Correctness bugs, broken contracts from the `AGENTS.md` files, and missing tests.
- Skip style issues, because ruff, ESLint and Prettier check them in CI.
- At most 5 comments, most important first, each with a concrete fix.

Repo-wide rules
- A PR changes one half (`backend/` or `frontend/`), not both.
- Dependency versions stay as pinned. Flag any upgrade or new dependency.
- Env vars are documented in that half's README with placeholder values. Flag real secrets.

Backend
- Risk comes from `sports_heat_stress_risk`, called with `tdb`, `tr`, `rh`, `vr`, `sport`,
  and returned unscored and unadjusted under `heat_risk` with its original field names.
- The MRT pipeline and the wind-height scaling are the only input transforms. Flag any
  clamping, default fill or remapping of model inputs.
- Open-Meteo data is untrusted. Upstream failures return the typed error shapes
  (502 `weather_provider_unavailable`, 422 with `unknown_inputs`), never a bare 500, and
  never leak URLs, coordinates or response bodies.
- Routes only parse, validate and delegate. Tests run without network.

Frontend
- User-facing text lives in `src/i18n/locales/*/translation.json`, in every language.
- Risk thresholds, colours and recommendation keys live only in `src/domain/riskRegistry.ts`.
- Derived state is computed, not synced. `useEffect` is only for external systems.
- Server state goes through React Query. Shared business state goes through Zustand selectors.
- Tests assert behaviour and contracts, not implementation details.

Quality gates
```bash
# backend/
uv run ruff check .
uv run pytest

# frontend/
pnpm run ci
```
