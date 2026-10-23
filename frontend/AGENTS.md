# SMA frontend

React 19, TypeScript, Vite, Mantine, React Router v7, nuqs, Zustand, TanStack React Query, i18next. Package manager `pnpm`.

## Gate

`pnpm run ci` (lint, prettier check, vitest, build) passes before handoff. `pnpm format` fixes what the prettier check reports. Single test: `pnpm vitest run <file>`.

## Rules

- User-facing text lives in `src/i18n/locales/*/translation.json`; components, hooks and stores reference keys.
- When env vars are added or changed, `frontend/README.md` gains the `cp .env.example .env.local` step and, per variable, its purpose and required/optional status.
- Shared business state lives in Zustand stores and is read through selectors.
- Risk thresholds, colors, icon mapping and recommendation i18n keys live only in `src/domain/riskRegistry.ts`.
- Server state goes through React Query; query functions accept and forward `AbortSignal` when feasible.
- Layout with Mantine primitives (`AppShell`, `Container`, `Grid`, `Stack`, `Flex`, `SimpleGrid`); CSS only for global baseline styles or third-party overrides.
- Derived state is computed from props or store selectors; `useEffect` is for synchronising with external systems. Component props stay presentational.
- Import boundaries between `api`/`config`/`domain`/`i18n`/`lib`, `components` and `pages` are enforced by `eslint.config.js`; relaxing one is a user decision.
- Tests cover changed behaviour in domain logic, stores, hooks and API adapters; assert contracts, not implementation.

## Home domain contracts (Mapbox + risk)

- `VITE_MAPBOX_ACCESS_TOKEN` is required for location suggest/retrieve.
- Risk requests need resolved coordinates. A fresh suggestion resolves them via retrieve; a saved location (`saved-locations:v1`) already holds them and goes straight to risk fetch.
- Valid prefilled `loc` from URL or `browserState` persistence auto-triggers suggest/retrieve and then risk fetch.
- Backend risk payload is `sport + latitude + longitude + profile` only.
- Risk refetches when selected location coordinates resolve and when sport changes.
- Missing token shows a configuration error.
- Suggest failures show a retryable error.
- Retrieve failures show a retryable error and block risk fetch.
- Risk API failures are surfaced and keep the last valid result.
- On successful fetch, update `profile`, `sport`, and `loc` query params with replace history.
- Persist `loc` filters to localStorage only for direct visits, never for shared links; saved locations persist on explicit save.
- Forecast time display uses backend-provided `time_local` for point labels/grouping and `request.location.timezone` for date formatting.
- Profile support is reserved for a future release: profile stays in the API, URL and localStorage contracts, Home filters show no Profile select, and bootstrap stays fixed to `ADULT`.
