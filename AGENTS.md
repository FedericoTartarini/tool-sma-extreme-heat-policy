# tool-sma-extreme-heat-policy

Sports Medicine Australia extreme heat policy risk tool. `backend/` is a FastAPI service that runs pythermalcomfort's sports heat stress model over Open-Meteo forecasts; `frontend/` is a React 19 + Vite + Mantine SPA. Each half has its own `AGENTS.md` with its toolchain, quality gate and domain contracts: read it before changing files there.

- A task changes one half; the gate in that half's `AGENTS.md` passes before handoff.
- Dependency versions stay as pinned. Upgrades, cross-half changes and kids/adults segmentation happen only on explicit request.
- Env vars are documented in that half's README with placeholder values. Real secrets stay out of git.

## Merge Policy
- No pull request merges into `development` without both of the following: (1) an AI
  review pass (CodeRabbit and/or a Claude/agent review of the diff) with its findings
  addressed or explicitly dismissed with reasoning, and (2) Federico Tartarini's
  explicit approval. A collaborator merging on their own judgment, even after an
  automated review ran clean, is not sufficient.
- If an automated review flags something ambiguous (e.g. a "review carefully"/slop
  warning), respond to it in the PR thread before merging — do not leave it
  unaddressed.
