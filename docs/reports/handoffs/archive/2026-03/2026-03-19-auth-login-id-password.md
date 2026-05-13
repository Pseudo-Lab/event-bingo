# Agent Handoff

## Task Metadata
- Task ID: 2026-03-19-auth-login-id-password

## Scope
- In scope: backend bingo auth redesign to `login_id + password`, frontend register/login UX update, recent-account relogin UX, mock auth removal, migration and admin export updates
- Out of scope: running live DB migration against an environment, password reset/recovery flow, admin UI redesign

## Inputs Used
- Source docs: `docs/reference/project-requirements.md`, `docs/reference/design-guide.md`, `docs/reference/agent-collaboration.md`
- Additional constraints: keep the existing user-facing screen style as stable as possible while removing mock-only flows

## Changes Made
- Files changed:
  - `backend/app/api/auth/routes.py`
  - `backend/app/api/auth/schema.py`
  - `backend/app/api/auth/services/bingo_login.py`
  - `backend/app/models/user.py`
  - `backend/app/api/admin/routes.py`
  - `backend/app/migrations/versions/c9f4f9c8b7a1_add_login_id_and_password_hash_to_bingo_user.py`
  - `frontend/src/api/bingo_api.ts`
  - `frontend/src/modules/Home/Home.tsx`
  - `frontend/src/modules/Home/Home.css`
  - `frontend/src/modules/Bingo/BingoGame.tsx`
  - `frontend/src/utils/authSession.ts`
  - `frontend/src/utils/recentBingoAccounts.ts`
  - deleted `frontend/src/api/mockBingoApi.ts`
- Behavior changes:
  - New bingo accounts are created with duplicate-friendly display names plus an auto-issued unique `login_id`
  - Returning users now log in with `login_id + password`
  - The home screen now separates first-time registration from returning-user login and stores recent accounts locally for easier relogin
  - Session storage no longer persists a password-like `loginKey`; it stores `loginId`
  - Mock tester login and mock preview auth flows are removed
  - Admin CSV exports show `LoginID` instead of `Email`

## Validation
- Tests run:
  - `npm run build` in `frontend/`
  - `npm run lint` in `frontend/`
  - `python3 -m compileall backend/app`
- Results:
  - frontend build passed
  - frontend lint passed
  - backend Python modules compiled successfully
- Not run and reason:
  - Alembic migration was not executed because no live DB target/environment was provided in this task
  - Backend integration tests were not run because the repository does not currently include DB-backed auth test cases beyond `conftest.py`

## Risks
- Known risks:
  - Existing users must go through the new DB migration before the updated auth flow will work
  - Migrated legacy users will inherit a generated `login_id` and a password hash derived from their legacy identifier; operators should communicate that transition if old data exists
  - `GET /api/auth/bingo/get-user-by-name` still returns a single user and is ambiguous when names are duplicated, though the updated frontend no longer relies on it
- Follow-up needed:
  - Apply the Alembic migration in each environment before deploying the frontend
  - Consider adding a password reset or account recovery path if event reuse across devices matters
  - Consider replacing the remaining by-name lookup endpoint with a multi-match response or removing it entirely

## Next Owner
- Owner: QA / deploy owner
- Expected next action: run the new migration in a test environment, verify register/login/relogin manually across logout and duplicate display names, then deploy FE and BE together
