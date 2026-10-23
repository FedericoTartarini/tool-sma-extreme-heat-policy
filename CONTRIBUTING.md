# Contributing

Thanks for contributing to this project.

## Workflow

- All changes land via a pull request — direct pushes to `main` or
  `development` are blocked for everyone except the repository admin.
- Open PRs against `development`, not `main`. `main` reflects what's
  deployed/released.
- A pull request needs:
  - **Approval from a code owner** (see `.github/CODEOWNERS`) before it can
    be merged. Approving your own PR, or another contributor's PR, does not
    satisfy this — it must come from the code owner.
  - The `frontend-ci` and `backend-ci` checks (`.github/workflows/ci.yml`)
    passing — lint, tests, and build must be green.
  - All review comment threads resolved.
- Keep PRs focused and reasonably small — it makes review faster.
- Don't include unrelated files (build artifacts, local docs, IDE config)
  in a commit.

## Before opening a PR

- Run the frontend and backend lint/test steps locally (see `ci.yml` for the
  exact commands) so CI doesn't surprise you.
- Rebase or merge the latest `development` into your branch if it's fallen
  behind, to avoid unnecessary conflicts at review time.

## Merging

Only the repository admin merges pull requests. If your PR is approved and
CI is green, it will be merged for you — you don't need (and shouldn't have)
merge access to `main`/`development` yourself.
