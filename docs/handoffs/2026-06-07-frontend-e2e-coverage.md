# Agent Handoff

## Task Metadata
- Task ID: frontend-e2e-coverage-audit-follow-up

## Scope
- In scope:
  - Fix full Playwright E2E failures found during the test audit.
  - Keep the event entry countdown flow locked until the public event profile is ready and the configured start time has passed.
  - Update E2E fixtures for 4x4 board defaults and explicit before-start entry restriction.
  - Run the full frontend Playwright suite in CI instead of only public smoke specs.
  - Add a lightweight AGENTS rule requiring full E2E verification for frontend behavior, admin UI, game flow, or E2E fixture changes.
- Out of scope:
  - Switching Playwright from Vite dev server to production preview.
  - Backend pytest dependency cleanup.
  - Adding React component-level tests for admin screens.

## Workspace
- Worktree path: `/home/ubuntu/.openclaw/workspace-df/event-bingo`
- Branch: `chore/full-e2e-ci-coverage`
- Base: `main` at `0ad3eab`

## Inputs Used
- Source docs:
  - `AGENTS.md`
  - `.github/PULL_REQUEST_TEMPLATE.md`
- Additional constraints:
  - CI/CD workflow changes require PR review.
  - PR title and body should be Korean.

## Changes Made
- Files changed:
  - `.github/workflows/ci.yaml`
  - `AGENTS.md`
  - `frontend/src/modules/Bingo/BingoGame.tsx`
  - `frontend/e2e/admin-event-settings.spec.ts`
  - `frontend/e2e/auth-and-setup.spec.ts`
  - `frontend/e2e/support/adminApi.ts`
  - `frontend/e2e/support/bingoApi.ts`
- Behavior changes:
  - Event bingo entry now rechecks the current public event profile before bootstrapping the board. If before-start entry restriction is enabled and the event has not started, it stays on the countdown screen and bootstraps after unlock.
  - Admin event E2E fixtures now support 4x4 board payloads.
  - CI frontend E2E job now runs `npm run e2e` for all Playwright specs.

## Validation
- Tests run:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run e2e -- auth-and-setup.spec.ts`
  - `npm run e2e`
- Results:
  - Frontend unit tests: 22 files, 94 tests passed.
  - Lint passed.
  - Build passed with the existing large chunk warning.
  - Targeted auth/setup E2E passed.
  - Full Playwright E2E passed: 14 tests.
- Not run and reason:
  - Backend tests were not rerun because this change does not touch backend code.

## Risks
- Known risks:
  - Full E2E will increase CI runtime compared with the previous public smoke-only job.
  - Playwright still runs against the Vite dev server, not a production preview build.
- Follow-up needed:
  - Consider switching Playwright CI to build plus `vite preview`.
  - Consider adding admin React component tests for UI-heavy changes.

## Next Owner
- Owner: Frontend / QA
- Expected next action:
  - Review PR and confirm CI runtime is acceptable.
  - Merge after CI passes.
