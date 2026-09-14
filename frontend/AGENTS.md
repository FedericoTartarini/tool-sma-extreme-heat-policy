# SMA frontend

React 19, TypeScript, Vite, Mantine, React Router v7, nuqs, Zustand, TanStack React Query, i18next. Alias `@/* -> src/*`. Package manager `pnpm`.

## Rules

- If env vars are added or changed, update `frontend/README.md`: `cp .env.example .env.local` steps, placeholders only, required/optional status and purpose per variable.
- Shared business state lives in Zustand stores, read through selectors; no prop drilling for it.
- Risk thresholds, colors, icon mapping and recommendation i18n keys live only in `src/domain/riskRegistry.ts`.
- Server state goes through React Query; query functions accept and forward `AbortSignal` when feasible.
- Layout with Mantine primitives (`AppShell`, `Container`, `Grid`, `Stack`, `Flex`, `SimpleGrid`); CSS only for global baseline styles or third-party overrides.
- Do not derive state in `useEffect` when it can be computed from props or store selectors. Component props stay presentational.
- Import boundaries: `src/api/**`, `src/config/**`, `src/domain/**`, `src/i18n/**`, `src/lib/**` must not import from `src/components/**` or `src/pages/**`; `src/components/**` must not import from `src/pages/**`. Any exception needs explicit user approval.
- Tests cover changed behaviour in domain logic, stores, hooks and API adapters; assert contracts, not implementation.

## Home domain contracts (Mapbox + risk)

- `VITE_MAPBOX_ACCESS_TOKEN` is required for location suggest/retrieve.
- Risk requests need resolved coordinates. A fresh suggestion resolves them via retrieve; a saved location (`saved-locations:v1`) already holds them and goes straight to risk fetch.
- Valid prefilled `loc` from URL or `browserState` persistence auto-triggers suggest/retrieve and then risk fetch.
- Backend risk payload must be `sport + latitude + longitude + profile` only.
- Risk must refetch when selected location coordinates resolve and when sport changes.
- Missing token must show a configuration error (no silent fallback).
- Suggest failures must show a retryable error (no local fallback path).
- Retrieve failures must show a retryable error and must block risk fetch.
- Risk API failures must be surfaced and keep the last valid result.
- On successful fetch, update `profile`, `sport`, and `loc` query params with replace history.
- Persist `loc` filters to localStorage only for direct visits (not shared links); saved locations persist on explicit save.
- Forecast time display uses backend-provided `time_local` for point labels/grouping and `request.location.timezone` for date formatting.
- Profile support is reserved for a future release: keep profile in the API, URL, and localStorage contracts, but do not expose a Profile select in Home filters and keep bootstrap fixed to `ADULT`.
