# Sports Medicine Australia Extreme Heat Policy Tool — Frontend

React + TypeScript + Vite frontend for the SMA Extreme Heat Policy tool.

## Overview

This app provides:

- Location-based heat stress risk assessment (via backend `POST /home/risk`)
- Evidence-based recommendations for each risk level
- Sport selection with translated labels and per-sport images
- Forecast risk chart UI backed by backend forecast points with nested inputs and heat-risk data

Based on:

- SMA Extreme Heat Risk and Response Guidelines: https://sma.org.au/resources/policies-and-guidelines/hot-weather/
- Tartarini, F. et al., 2025. A modified sports medicine Australia extreme heat policy and web tool. _Journal of Science and Medicine in Sport_. https://www.sciencedirect.com/science/article/pii/S1440244025000696

## Setup

1. Install deps: `pnpm install`
2. Create local env file: `cp .env.example .env.local`
3. Run dev server: `pnpm dev`
4. Run tests: `pnpm test`

## Environment (`.env.local`)

Create `frontend/.env.local` by copying `frontend/.env.example`:

```bash
cp .env.example .env.local
```

Then fill in values (do not commit real tokens/keys):

You can get a Mapbox public token for free at https://account.mapbox.com/access-tokens/ (create a free account if you don't have one).

```bash
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
VITE_API_BASE_URL=http://localhost:8000
```

Notes:

- `VITE_MAPBOX_ACCESS_TOKEN` is required for Home location `suggest + retrieve`.
- `VITE_API_BASE_URL` is required for backend forecast and current-risk data.
- `.env.local` is ignored by git via `*.local`.

## Project structure (Layer-first)

| Path             | Responsibility                              |
| ---------------- | ------------------------------------------- |
| `src/app`        | app shell + site layout                     |
| `src/pages`      | route-level pages (`HomePage`, `AboutPage`) |
| `src/components` | UI components (page-specific + shared)      |
| `src/api`        | IO layer (backend + Mapbox)                 |
| `src/domain`     | pure domain types + rules                   |
| `src/hooks`      | reusable hooks (no UI copy)                 |
| `src/lib`        | pure helpers (no UI copy)                   |
| `src/config`     | app-wide config (Mantine theme)             |
| `src/i18n`       | i18n init + bundled locale JSON             |
| `src/store`      | app-wide stores (Zustand)                   |
| `src/App.tsx`    | providers + routes                          |

Import rules:

- `src/api/**`, `src/config/**`, `src/domain/**`, `src/i18n/**`, `src/lib/**` must not import from `src/components/**` or `src/pages/**`.
- `src/components/**` must not import from `src/pages/**`.
- Pages can import from any layer.

## Home flow (Mapbox + risk)

- Client state lives in `src/store/homeStore.ts` (Zustand).
- Uses the official `zustand` npm package.
- Server state uses React Query (`@tanstack/react-query`).
- Location search uses Mapbox Search Box `suggest`; selecting a suggestion triggers Mapbox `retrieve` in frontend to resolve coordinates.
- Prefilled location labels restored from shared URL (`loc`) or local persistence automatically attempt `suggest + retrieve` once using exact normalized label matching.
- Risk API request sends `sport + latitude + longitude + profile` (no Mapbox identifiers).
- Risk API response returns a non-empty `forecast[]` plus a nested `request` block containing `sport`, `profile`, and `location`; backend defines `forecast[0]` as the earliest complete forecast point, and frontend derives the current risk from that point while grouping forecast days in the selected location timezone when available, otherwise browser local timezone.
- Risk is fetched automatically when:
  - a location suggestion is selected (manual or auto-resolved) and coordinates are resolved, and
  - the sport changes, and
  - the selected profile changes.
- Risk API failures are shown in UI and keep the last valid result (no silent fallback to fixtures).
- After a successful fetch:
  - URL query params update (`profile`, `sport`, `loc`) and
  - the last selection is persisted to localStorage only for direct visits (not shared links).
- Dates are formatted in the selected location timezone when available, otherwise browser local timezone.
- API time contract: if datetime fields are introduced in request/response payloads, they must use ISO-8601 UTC format (`...Z`).
- The Home filters expose a Profile select above Location and Sport.
- Public profile values are `ADULT`, `UNDER_10`, `AGE_10_13`, and `AGE_14_17`.
- The current profile is sent to the backend and restored from shared URLs or local persistence.

## i18n

- All user-facing text lives in `src/i18n/locales/en/translation.json`.
- Components/pages use `useTranslation()` and `t(...)`.
- Do not embed visible copy directly in components/hooks/libs.

## Formatting

- `pnpm format` (writes)
- `pnpm format:check` (CI-safe)
- `pnpm lint` (ESLint)
- `pnpm lint:ci` (ESLint + Prettier check)
- `pnpm test` (Vitest watch mode)
- `pnpm test:ci` (Vitest single run)
- `pnpm build`

## GitHub Pages deployment

Frontend deploys to GitHub Pages from pushes to `development` via
the workflow at `.github/workflows/frontend-pages.yml`.

Repository settings:

- Settings -> Pages -> Source: `GitHub Actions`

Repository Variables required for deploy builds:

- `VITE_API_BASE_URL`
- `VITE_MAPBOX_ACCESS_TOKEN`

Notes:

- GitHub Pages builds inject the repo subpath automatically so Vite assets and
  React Router routes resolve correctly under
  `https://yehui-h.github.io/tool-sma-extreme-heat-policy/`.
- The app includes a `404.html` SPA fallback so direct visits and refreshes on
  routes like `/about` keep working on GitHub Pages.

## Frontend Conventions Compliance

- Prettier is mandatory: always run `pnpm format` before handoff and keep
  `pnpm lint:ci` green.
- Exported functions should include short JSDoc as required by
  `frontend/AGENTS.md`.
- Keep layouts Mantine-first (`Stack`, `Grid`, `Flex`, `Container`) and avoid
  page layout in custom CSS.
- Keep user-facing copy in i18n JSON files under `src/i18n/locales/*` and use
  translation keys in components/hooks/libs.
- Shared business state belongs in Zustand stores; avoid prop drilling for
  shared business state.
- Risk metadata is centralized in `src/domain/riskRegistry.ts` (thresholds,
  colors, icon paths, and recommendation i18n keys).
