# Agent Handoff: Event Keyword English Labels

## Task Metadata
- Task ID: event-keyword-english-labels

## Scope
- In scope:
  - Add event-level English participant support setting.
  - Add admin-managed English keyword labels.
  - Translate fixed event home/login screen UI when English is selected.
  - Prefer English keyword labels on the game screen when the participant selects English.
  - Warn admins when English labels are missing and fall back to Korean labels.
- Out of scope:
  - Automatic translation.
  - Existing board data migration.

## Workspace
- Worktree path: `/home/ubuntu/.openclaw/workspace-bingo`
- Branch: `feature/event-keyword-english-labels`
- Base: local `main` including `feat: 게임 화면 영어 설정 추가`

## Inputs Used
- Source docs:
  - `AGENTS.md`
  - `docs/templates/agent-handoff.md`
- Additional constraints:
  - Preserve existing `keywords: string[]` API compatibility where possible.
  - Keep bingo board and analytics canonical keyword values stable.

## Changes Made
- Files changed:
  - Backend event model, migration, admin/public/play API schemas and routes.
  - Admin keyword utilities and event form UI.
  - Public event profile mapping and game keyword display.
  - Event home language copy, language switch, Google login button locale, and fixed login consent copy.
  - Unit/E2E fixtures and tests.
- Behavior changes:
  - `events.english_support_enabled` stores whether an event supports English participants.
  - Admin create/update accepts `english_support_enabled` and `keyword_translations`.
  - When English support is enabled, `events.keywords` JSON stores keyword objects with `ko` and `en`.
  - Admin/public responses still expose `keywords` as Korean canonical strings and add `keyword_translations`.
  - Event home reads/writes the same `event-bingo.game-language.v1` setting used by the game screen.
  - Event home translates fixed UI copy, fallback labels, and date formatting for English mode.
  - Game screen English mode displays English labels when provided, otherwise Korean fallback.

## Validation
- Tests run:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run e2e`
  - Backend AST parse for modified files with `/tmp/event-bingo-backend-venv/bin/python`
- Results:
  - Frontend unit tests: 99 passed.
  - Frontend lint: passed.
  - Frontend build: passed.
  - Playwright E2E: 16 passed.
  - Backend AST parse: passed.
- Not run and reason:
  - Backend pytest did not run because `/tmp/event-bingo-backend-venv` has broken pytest/fastapi imports in this environment.

## Risks
- Known risks:
  - Runtime DB must apply migration `f3a4b5c6d7e8_add_event_english_support_flag.py` before backend code runs against an existing database.
  - Existing boards keep canonical stored values; language display is applied at render time.
- Follow-up needed:
  - Run backend tests in a healthy Python environment.
  - Apply DB migration in the target environment before preview/deploy.

## Next Owner
- Owner: Backend + Frontend reviewer
- Expected next action:
  - Review API contract change and migration, then verify on `bingo-private` after migration.
