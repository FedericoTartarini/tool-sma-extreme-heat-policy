# AI Engineering Guide (Global)

## Purpose
- This file is the global source of truth for AI-assisted development across this repository.
- It defines shared engineering standards for consistency, maintainability, and production safety.
- It applies to all folders unless a deeper `AGENTS.md` provides stricter local rules.

## Scope and Precedence
- Scope: entire repository (`frontend/`, `backend/`, and shared root files).
- Precedence order:
  1. Direct user task instructions
  2. This global `AGENTS.md`
  3. Folder-specific `AGENTS.md` (for stricter local implementation details)
- If two rules conflict, choose the safer and more restrictive option, then document the decision in the handoff.

## Repository Strategy
- Keeping `frontend/` and `backend/` as top-level subfolders is a good and recommended structure.
- Benefits:
  - clear separation of concerns,
  - independent toolchains and dependencies,
  - reduced accidental coupling,
  - easier AI context targeting by domain.
- If cross-layer contracts grow, add a shared contract location (for example `shared/` or `docs/contracts/`) for API schemas and shared types.

## Universal Engineering Principles
- Write code that is easy to read, test, and delete.
- Keep code DRY: extract repeated logic into shared utilities, hooks, services, or components.
- Prefer simple, explicit designs over clever abstractions.
- Keep functions and modules focused on one clear responsibility.
- Avoid hidden side effects; keep data flow predictable.
- Make naming intention-revealing and domain-oriented.
- Preserve backward compatibility unless a breaking change is explicitly requested.
- Do not leave dead code, commented-out code, or temporary debugging artifacts.

## Project Organization Standards
- Respect established layer boundaries within each app.
- Place code by responsibility, not convenience.
- Keep domain/business logic out of presentation layers.
- Keep framework-specific glue thin and move reusable logic to shared modules.
- Prefer small, composable files over large multipurpose files.

## React and Frontend Baseline (Global)
- Use modern React patterns: functional components, hooks, and explicit state boundaries.
- Prefer composition over deep prop drilling.
- Keep business logic out of UI components where practical.
- Use TypeScript types/interfaces at module boundaries.
- Keep user-facing text externalized via i18n, not hard-coded in UI logic.
- Enforce formatting and linting through project scripts; do not hand-format selectively.
- Follow the detailed frontend rules in `frontend/AGENTS.md` for implementation specifics.

## Backend Baseline (Global)
- Keep API routing, validation, orchestration, and calculation concerns separated.
- Validate inputs at boundaries and return explicit, actionable errors.
- Keep contracts stable and explicit; avoid silent behavior changes.
- Prefer deterministic, testable service logic with clear dependency boundaries.
- Follow the detailed backend rules in `backend/AGENTS.md` for domain constraints.

## Quality Gates (Definition of Done)
- Every change should satisfy all applicable checks before handoff:
  - formatting,
  - lint/static analysis,
  - type checking (when applicable),
  - tests,
  - build/startup sanity checks.
- Minimum expected commands by area:
  - Frontend: run scripts defined in `frontend/package.json` (`format`, `lint`, `build`, and related CI checks).
  - Backend: run `ruff`, `pytest`, and a local startup check using repository standard commands.
- If a check is skipped or fails, report it explicitly with reason and risk.

## AI Editing Workflow
- Read relevant files first; follow existing patterns before introducing new ones.
- Make the smallest safe change set for the request.
- Do not perform opportunistic refactors unless they directly support the task.
- Update docs when behavior, contracts, or configuration changes.
- Never commit secrets, tokens, or environment-specific credentials.
- When adding environment variables, update docs and examples with placeholders only.

## Review and Refactor Guidance
- During code review, prioritize:
  1. correctness and safety,
  2. contract compatibility,
  3. maintainability and readability,
  4. performance/accessibility implications,
  5. stylistic consistency.
- For refactors, require a clear payoff (reduced duplication, simpler flow, or stronger boundaries).
- Avoid broad rewrites when focused fixes can deliver the same outcome safely.

## Handoff Requirements
- Provide a concise change summary with file paths.
- Note which checks were run and their outcomes.
- Call out follow-up risks, assumptions, and recommended next actions.
