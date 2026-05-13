# Agent Handoff

## Task Metadata
- Task ID: 2026-03-21-consent-policy-single-source

## Scope
- In scope:
  - Move the consent/privacy template to a single backend-backed source of truth.
  - Expose public read and admin read/update APIs for the template.
  - Update the admin policies tab so Admin can edit the template and Event Manager remains read-only.
  - Update the home consent dialog to consume the stored template instead of a duplicated frontend fallback/static file.
- Out of scope:
  - Per-event policy templates.
  - Rich markdown editor features beyond plain textarea plus preview.

## Inputs Used
- Source docs:
  - `docs/reference/project-requirements.md`
  - `docs/reference/design-guide.md`
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - Remove duplicate consent copy and keep a single runtime source.
  - Restrict editing to `admin` accounts only.

## Changes Made
- Files changed:
  - `backend/app/models/policy_template.py`
  - `backend/app/migrations/versions/3b9c1f0d2a77_add_policy_templates_table.py`
  - `backend/app/api/events/schema.py`
  - `backend/app/api/events/routes.py`
  - `backend/app/api/admin/schema.py`
  - `backend/app/api/admin/console_services.py`
  - `backend/app/api/admin/routes.py`
  - `backend/app/tests/test_admin_routes.py`
  - `backend/app/tests/test_event_routes.py`
  - `frontend/src/api/admin_api.ts`
  - `frontend/src/api/public_event_api.ts`
  - `frontend/src/modules/Admin/AdminPortal.tsx`
  - `frontend/src/modules/Admin/adminTypes.ts`
  - `frontend/src/modules/Home/ConsentDialog.tsx`
  - `frontend/src/utils/consentTemplate.ts`
  - `frontend/src/utils/consentTemplate.test.ts`
  - `frontend/e2e/support/bingoApi.ts`
  - `frontend/e2e/home.smoke.spec.ts`
  - `frontend/e2e/auth-and-setup.spec.ts`
  - `frontend/README.md`
  - removed `frontend/public/templates/consent.md`
- Behavior changes:
  - Consent/privacy markdown now lives in `policy_templates` and is auto-seeded on first read if missing.
  - Public consent dialogs load `/api/events/consent-template` instead of reading a static frontend markdown file.
  - Admin policies tab reads the same stored template, shows preview, and allows save/reset only for Admin users.
  - Event Manager can still access the policies page but only in read-only mode.
  - E2E consent/home/auth setup mocks now target the API-backed template flow and current routed event page.

## Validation
- Tests run:
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_admin_routes.py backend/app/tests/test_event_routes.py backend/app/tests/test_admin_console_services.py`
  - `npm run test -- src/utils/consentTemplate.test.ts src/modules/Admin/adminEventDate.test.ts`
  - `npm run build`
  - `npm run e2e -- home.smoke.spec.ts auth-and-setup.spec.ts`
- Results:
  - All passed.
- Not run and reason:
  - Full frontend/backend test suites were not run to keep scope focused on the touched consent/policy flows.

## Risks
- Known risks:
  - The consent renderer still assumes the markdown uses `■`-prefixed section markers for structured dialog rendering.
  - Existing historical handoff docs still mention `public/templates/consent.md`; they were not rewritten because they describe past work.
- Follow-up needed:
  - Consider adding server-side integration tests for the new policy template endpoints with a temporary test DB.
  - If legal copy becomes event-specific later, introduce per-event override support instead of editing the global template.

## Next Owner
- Owner: qa
- Expected next action:
  - Verify admin save flow with an Admin account, read-only visibility with an Event Manager account, and confirm the updated template appears in the home consent dialog without refresh issues.
