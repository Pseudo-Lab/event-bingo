## Task Metadata
- Task ID: 2026-03-19-auth-lookup-cleanup-and-exchange-e2e

## Scope
- In scope:
  - Remove legacy auth lookup endpoints that were no longer used by the frontend
  - Expand Playwright coverage for exchange duplicate and retry scenarios
- Out of scope:
  - Change login/register request or response shapes
  - Add DB-backed backend integration tests

## Inputs Used
- Source docs:
  - `docs/reference/project-requirements.md`
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - Preserve the current login and interaction contracts used by the frontend
  - Keep route-mock E2E structure simple enough for first-time contributors

## Changes Made
- Files changed:
  - `backend/app/api/auth/routes.py`
  - `backend/app/api/auth/services/bingo_login.py`
  - `backend/app/tests/test_auth_routes.py`
  - `frontend/e2e/exchange.spec.ts`
  - `frontend/e2e/support/bingoApi.ts`
  - `frontend/README.md`
- Behavior changes:
  - Removed `/api/auth/bingo/get-user`
  - Removed `/api/auth/bingo/get-user-by-name`
  - Removed `/api/auth/bingo/get-user/{user_id}`
  - Added E2E coverage for duplicate exchange blocking and retry-after-error

## Validation
- Tests run:
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_auth_routes.py backend/app/tests/test_bingo_interaction_services.py`
  - `npm run test`
  - `npm run e2e`
- Results:
  - All commands passed
- Not run and reason:
  - Full backend suite was not run because the repository currently has targeted unit tests rather than a broader API integration harness

## Risks
- Known risks:
  - External clients outside this repository that still depended on the removed auth lookup endpoints will now fail
  - Backend still emits a Pydantic v2 deprecation warning from class-based config usage
- Follow-up needed:
  - Add login failure and invalid opponent E2E scenarios next
  - Migrate remaining Pydantic schema config to `ConfigDict`

## Next Owner
- Owner: frontend or backend
- Expected next action:
  - Keep expanding route-mock E2E around retry, empty, and sync edge cases while deciding whether broader backend API tests are worth adding
