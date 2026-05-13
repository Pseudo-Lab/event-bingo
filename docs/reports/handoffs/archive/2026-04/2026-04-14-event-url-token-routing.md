## Task Metadata
- Task ID: 2026-04-14-event-url-token-routing

## Scope
- In scope:
  - Remove manual event slug input from admin event create/edit flow
  - Remove draft/published controls from admin and public/play gating
  - Auto-generate event slug tokens from event id
  - Move public event page paths to `/event/{token}` and keep legacy redirects
- Out of scope:
  - DB migration removing `publish_state` / `first_published_at` columns
  - Reworking unrelated bingo UI, mock auth, or participant search changes already present in the worktree

## Inputs Used
- Source docs:
  - `docs/reference/project-requirements.md`
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - User confirmed legacy data can be discarded
  - User requested `/event/{token}` style public URLs

## Changes Made
- Files changed:
  - `backend/app/models/event.py`
  - `backend/app/api/admin/routes.py`
  - `backend/app/api/admin/schema.py`
  - `backend/app/api/admin/console_services.py`
  - `backend/app/api/events/routes.py`
  - `backend/app/api/events/schema.py`
  - `backend/app/api/play/routes.py`
  - `backend/app/tests/test_event_model.py`
  - `backend/app/tests/test_admin_console_services.py`
  - `frontend/src/App.tsx`
  - `frontend/src/config/eventProfiles.ts`
  - `frontend/src/config/eventProfiles.test.ts`
  - `frontend/src/api/admin_api.ts`
  - `frontend/src/api/public_event_api.ts`
  - `frontend/src/modules/Admin/AdminPortal.tsx`
  - `frontend/src/modules/Admin/adminTypes.ts`
  - `frontend/src/modules/Landing/LandingHomePage.tsx`
  - Deleted unused legacy helpers: `frontend/src/modules/Admin/adminEventStore.ts`, `frontend/src/modules/Admin/adminSlugUtils.ts`, `frontend/src/modules/Admin/adminSlugUtils.test.ts`
- Behavior changes:
  - New events now receive an automatic 8-character opaque slug token derived from `event id + salt`
  - Admin event form no longer accepts slug input or draft/published selection
  - Admin event detail/public path now points to `/event/{token}`
  - Public event list/profile and play join endpoints no longer block on `publish_state`
  - Frontend public event routing now uses `/event/:eventSlug` and legacy `/:eventSlug` URLs redirect to the new path

## Validation
- Tests run:
  - `npm run test -- src/config/eventProfiles.test.ts`
  - `npm run build`
  - `backend/venv/bin/python -m py_compile backend/app/models/event.py backend/app/api/admin/routes.py backend/app/api/admin/schema.py backend/app/api/admin/console_services.py backend/app/api/events/routes.py backend/app/api/events/schema.py backend/app/api/play/routes.py`
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_event_model.py`
- Results:
  - All above passed
- Not run and reason:
  - `backend/app/tests/test_admin_console_services.py` and `backend/app/tests/test_event_routes.py` could not be collected because the current backend venv is missing `python-jose` (`ModuleNotFoundError: jose`) during `api` package import

## Risks
- Known risks:
  - Legacy DB columns for `publish_state` and `first_published_at` still exist; they are now effectively ignored by the main product flow
  - Existing old-style links still work only because of frontend redirects; external integrations should switch to `/event/{token}`
- Follow-up needed:
  - If desired, add a migration later to remove unused publish-state columns and related enum values
  - Install missing backend auth dependency (`python-jose`) before running the broader backend pytest suite

## Next Owner
- Owner: frontend/backend
- Expected next action:
  - Smoke-test admin event creation in the dev environment and confirm newly created events open under `/event/{token}`
