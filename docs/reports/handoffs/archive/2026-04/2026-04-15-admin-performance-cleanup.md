## Task Metadata
- Task ID: 2026-04-15-admin-performance-cleanup

## Scope
- In scope:
  - Reduce duplicate admin auth and admin console API calls
  - Fix admin event list progress query to join bingo boards by both `user_id` and `event_id`
  - Add focused regression tests for the new admin loading helpers and backend query helper
- Out of scope:
  - Participant-side Google bridge/login flow tuning
  - New admin API surface for lightweight counts or split detail endpoints
  - Unrelated frontend worktree changes already present before/alongside this task

## Inputs Used
- Source docs:
  - `AGENTS.md`
  - `docs/templates/agent-handoff.md`
- Additional constraints:
  - Preserve unrelated dirty worktree changes
  - Keep changes small and verify with frontend and backend tests

## Changes Made
- Files changed:
  - `frontend/src/api/admin_api.ts`
  - `frontend/src/modules/Admin/AdminPortal.tsx`
  - `frontend/src/modules/Admin/adminConsoleLoaders.ts`
  - `frontend/src/modules/Admin/adminConsoleLoaders.test.ts`
  - `backend/app/api/admin/console_services.py`
  - `backend/app/api/admin/routes.py`
  - `backend/app/main.py`
  - `backend/app/tests/test_admin_console_services.py`
- Behavior changes:
  - Admin login page now reuses stored admin session in the same tab instead of always re-verifying immediately
  - Admin console now syncs the Supabase session token before protected API loads, then skips redundant `/api/admin/auth/me` calls when session identity is already known
  - Admin console now loads only the data needed for the active section instead of always preloading events, members, and applications together
  - Admin event detail fetch no longer re-runs on every detail tab switch for the same event
  - Unauthorized admin API responses now trigger sign-out and redirect instead of leaving the console in a broken state
  - Admin event progress aggregation now joins bingo boards on both `user_id` and `event_id`, avoiding cross-event overcounting and extra joined rows
  - Legacy admin seed cleanup now runs during app startup so the first admin request does not pay that cost

## Validation
- Tests run:
  - `npm run test -- src/modules/Admin/adminConsoleLoaders.test.ts src/modules/Admin/adminEventDate.test.ts src/modules/Admin/adminKeywordUtils.test.ts`
  - `npm run build`
  - `npm run lint`
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_admin_console_services.py backend/app/tests/test_admin_routes.py`
- Results:
  - All passed
- Not run and reason:
  - Full e2e suite not run; this task changed admin loading behavior but the focused unit/build checks were sufficient for this pass

## Risks
- Known risks:
  - Sidebar application badge/count now reflects loaded data only; there is still no lightweight count-only endpoint
  - Participant-side Google bridge/session restoration flow still has separate Supabase checks outside this task
- Follow-up needed:
  - Consider splitting admin dashboard/detail APIs into lighter summary endpoints if large event datasets still feel slow
  - Consider adding a dedicated pending-application count endpoint if badge freshness on every admin section is required

## Next Owner
- Owner: frontend / backend
- Expected next action:
  - Validate the admin login and event-settings flow against a real deployed environment with Supabase latency and production-sized event data
