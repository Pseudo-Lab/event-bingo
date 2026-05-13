## Task Metadata
- Task ID: 2026-04-14-admin-google-only-auth-cleanup

## Scope
- In scope:
  - Remove legacy admin local-login and invitation/password-setup flows.
  - Keep admin console on Google + Supabase session verification only.
  - Update admin UI/API/tests to match Google-only behavior.
- Out of scope:
  - Bingo participant login flow changes.
  - Admin DB schema/migration cleanup for legacy columns.

## Inputs Used
- Source docs:
  - `docs/reference/project-requirements.md`
  - `AGENTS.md`
- Additional constraints:
  - User requested Google login only for admin flow.

## Changes Made
- Files changed:
  - `frontend/src/modules/Admin/AdminPortal.tsx`
  - `frontend/src/api/admin_api.ts`
  - `frontend/src/modules/Admin/adminTypes.ts`
  - `frontend/src/utils/adminSession.ts`
  - `backend/app/api/admin/auth.py`
  - `backend/app/api/admin/routes.py`
  - `backend/app/api/admin/schema.py`
  - `backend/app/api/admin/console_services.py`
  - `backend/app/tests/test_admin_routes.py`
  - `backend/app/tests/test_admin_console_services.py`
  - `backend/app/config/.env.example`
- Behavior changes:
  - Admin login page now supports Google login only.
  - Local admin email/password login route and UI are removed.
  - Admin approval/create flows no longer expose invite links or password setup.
  - Approved/admin-added emails are expected to sign in with Google directly.

## Validation
- Tests run:
  - `npm run build`
  - `PYTHONPATH=backend/app backend/venv/bin/python -m py_compile backend/app/api/admin/auth.py backend/app/api/admin/routes.py backend/app/api/admin/schema.py backend/app/api/admin/console_services.py`
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_admin_routes.py backend/app/tests/test_admin_console_services.py`
- Results:
  - All passed.
- Not run and reason:
  - Full backend/frontend test suites were not run; targeted auth/admin checks were sufficient for this scope.

## Risks
- Known risks:
  - Legacy DB fields like `password_setup_required` still exist for compatibility and are no longer user-facing.
- Follow-up needed:
  - Remove unused legacy admin model fields/migrations later if full auth schema cleanup is desired.

## Next Owner
- Owner: frontend/backend
- Expected next action:
  - If desired, follow up with DB-level cleanup of unused admin invitation/password fields.
