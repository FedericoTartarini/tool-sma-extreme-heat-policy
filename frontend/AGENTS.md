# AI Working Guide for SMA Frontend

## Purpose and Scope

- This guide applies only to `frontend/`.
- It extends the global rules in the repository root `AGENTS.md`.
- If a local and global rule conflict, follow the stricter rule and note it in handoff.

## Project Snapshot

- Stack: React 19, TypeScript, Vite, Mantine, React Router v7, nuqs, Zustand, TanStack React Query, i18next.
- Alias: `@/* -> src/*`.
- Package manager: `pnpm`.
- Core scripts:
  - `pnpm dev`
  - `pnpm lint`
  - `pnpm test:ci`
  - `pnpm build`

## Non-Negotiable Rules

1. README `.env.local` contract:
   - If env vars are added or changed, update `frontend/README.md`.
   - Include `cp .env.example .env.local` setup steps.
   - Include placeholders only (never real keys/tokens).
   - Document required/optional status and purpose for each variable.
2. Formatting and linting are mandatory:
   - Format with Prettier before handoff.
   - Keep `pnpm format:check` and `pnpm lint:ci` green.
3. Keep code DRY and focused:
   - Extract repeated logic into shared hooks, domain utilities, or reusable components.
   - Keep each function/component focused on one responsibility.
4. No hard-coded visible copy:
   - Keep user-facing text in `src/i18n/locales/*/translation.json`.
   - Do not embed visible strings in components/hooks/stores/libs.
5. Shared state architecture:
   - Shared business state belongs in Zustand stores.
   - Read store state through selectors.
   - Avoid prop drilling for shared business state.
6. Risk registry centralization:
   - Keep risk thresholds, colors, icon mapping, and recommendation i18n keys in `src/domain/riskRegistry.ts`.
   - Do not duplicate risk definitions in other files.

## React and UI Rules

- Use modern React patterns: functional components, hooks, and explicit effect dependencies.
- Avoid deriving state in `useEffect` when it can be computed from props/store selectors.
- Keep presentational components lean; move business logic to hooks/domain/store.
- Prefer Mantine primitives for layout (`AppShell`, `Container`, `Grid`, `Stack`, `Flex`, `SimpleGrid`).
- Do not build page layout in CSS/CSS Modules; CSS is limited to focused exceptions (global baseline styles or third-party overrides).
- Document only non-obvious public contracts (for example: complex data transforms, side effects, or domain assumptions). Avoid redundant comments.

## Architecture (Layer-First)

- Keep the current structure:
  - `src/app` - app shell and top-level layout
  - `src/pages` - route-level page composition
  - `src/components` - reusable and page-level UI pieces
  - `src/api` - external IO (backend and Mapbox)
  - `src/domain` - pure domain types and rules
  - `src/hooks` - reusable UI/business hooks
  - `src/lib` - pure utilities
  - `src/config` - app config (theme, constants)
  - `src/i18n` - i18n setup and locale bundles
  - `src/store` - Zustand stores

## Import Boundary Rules

- `src/api/**`, `src/config/**`, `src/domain/**`, `src/i18n/**`, `src/lib/**` must not import from `src/components/**` or `src/pages/**`.
- `src/components/**` must not import from `src/pages/**`.
- Use `@/` imports for `src` paths consistently.
- Any boundary exception requires explicit user approval.

## Data Fetching and State Contracts

- Prefer React Query for server state (caching, retries, cancellation).
- Query functions should accept/forward `AbortSignal` when feasible.
- Keep component props presentation-focused (display data, callbacks, `children`).
- Keep hooks/stores free of embedded visible copy.

## Home Domain Contracts (Mapbox + Risk)

- `VITE_MAPBOX_ACCESS_TOKEN` is required for location suggest/retrieve.
- Frontend must resolve coordinates via retrieve before risk requests.
- Valid prefilled `loc` from URL or local persistence should auto-trigger suggest/retrieve and then risk fetch.
- Backend risk payload must be `sport + latitude + longitude` only.
- Risk must refetch when selected location coordinates resolve and when sport changes.
- Missing token must show a configuration error (no silent fallback).
- Suggest failures must show a retryable error (no local fallback path).
- Retrieve failures must show a retryable error and must block risk fetch.
- Risk API failures must be surfaced and keep the last valid result.
- On successful fetch, update `sport` and `loc` query params with replace history.
- Persist to localStorage only for direct visits (not shared links).
- Forecast time display uses selected location timezone first; browser timezone is fallback only.

## Testing Expectations

- Add or update tests for changed behavior in domain logic, stores, hooks, and API adapters.
- Prefer deterministic tests that assert behavior contracts rather than implementation details.

## AI Editing Workflow

- Read relevant files before editing; follow existing local patterns.
- Make the smallest safe change set for the task.
- Do not edit generated output such as `dist/`.
- Do not silently alter route shapes, env contracts, or architecture boundaries.

## Validation Checklist Before Handoff

- Run `pnpm format`.
- Run `pnpm lint:ci` (or both `pnpm lint` and `pnpm format:check`).
- Run `pnpm test:ci` for behavior validation.
- Run `pnpm build`.
- Confirm no architecture boundary violations.
- Confirm Home flow contracts still hold.

## Out of Scope / Do Not Change

- No backend changes unless explicitly requested.
- No dependency upgrades unless explicitly requested.
- No broad redesign unless explicitly requested.
- No kids/adults segmentation work unless explicitly requested.
- Apply these rules to new work and touched files; do not force a full historical retrofit.
