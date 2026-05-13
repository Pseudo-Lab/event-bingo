# Static Platform Privacy Policy Handoff

## Task Metadata
- Task ID: 2026-05-14-static-platform-privacy-policy
- Context: Platform privacy policy should be a reviewed fixed public document, not a DB-editable runtime template.

## Scope
- In scope:
- Convert public `/privacy` rendering to frontend static markdown.
- Stop exposing `platform_privacy_markdown` as an Admin-editable policy template.
- Keep legacy public policy API compatible while returning code-defined platform policy content instead of DB content.
- Align terms, platform policy, and event participant notice with the current data inventory where the direction was agreed.
- Out of scope:
- Removing the `policy_templates` table or existing historical DB rows.
- Final legal review of the policy language.
- Changing event participant notice storage beyond keeping the existing `consent_markdown` admin template flow.

## Inputs Used
- Source docs:
- `docs/handoffs/2026-05-14-legal-policy-data-inventory.md`
- `docs/handoffs/2026-05-14-service-commercialization-and-payment-notes.md`
- Additional constraints:
- Current stage is pilot/MVP, not commercial billing launch.
- Platform policy should stay stable enough for public policy links and OAuth policy URL usage.

## Changes Made
- Files changed:
- `frontend/src/modules/Landing/platformPrivacyPolicy.ts`
- `frontend/src/modules/Landing/PublicPrivacyPage.tsx`
- `frontend/src/modules/Admin/AdminPortal.tsx`
- `frontend/src/modules/Admin/adminTypes.ts`
- `backend/app/models/policy_template.py`
- `backend/app/api/events/routes.py`
- `backend/app/api/admin/routes.py`
- `backend/app/tests/test_policy_template_defaults.py`
- `frontend/src/modules/Landing/PublicTermsPage.tsx`
- Behavior changes:
- `/privacy` no longer calls `/api/events/privacy-template`; it renders a fixed frontend markdown document.
- Platform policy text now explicitly covers sessionStorage/localStorage storage, admin/event-manager access, CSV export, free-input risk, sensitive-data restrictions, and future feature handling as separate notice/consent/legal-basis review.
- Terms now prohibit entering sensitive information, unique identifiers, third-party personal information, or non-public information in free-input fields, and note that admin CSV export can include participant data.
- Event participant notice now includes actual participant/login/Google/Supabase/board/progress/interaction/review data categories, admin/CSV visibility, and free-input restrictions.
- The prior deployed event notice text exposed at `/event/test-bingo/privacy` was added as a built-in revision, so matching DB templates auto-upgrade to the current default.
- Admin policy template editor now only manages the event participant notice template.
- `GET /api/events/privacy-template` remains available for compatibility but returns the code-defined platform policy and fixed updated timestamp instead of reading `policy_templates`.
- `GET/PUT /api/admin/policy-template?template_key=platform_privacy_markdown` is no longer accepted.

## Validation
- Tests run:
- `npm run build`
- `npx eslint src/modules/Landing/PublicPrivacyPage.tsx src/modules/Landing/platformPrivacyPolicy.ts src/modules/Landing/PublicTermsPage.tsx src/modules/Admin/AdminPortal.tsx src/modules/Admin/adminTypes.ts --ext ts,tsx --report-unused-disable-directives --max-warnings 0`
- `PYTHONPATH=app /tmp/event-bingo-backend-venv/bin/pytest app/tests/test_policy_template_defaults.py app/tests/test_event_routes.py app/tests/test_admin_routes.py`
- `PYTHONPYCACHEPREFIX=/tmp/event-bingo-pycache python3 -m py_compile app/models/policy_template.py app/api/events/routes.py app/api/admin/routes.py`
- Results:
- Frontend build passed.
- Changed frontend files lint passed.
- Backend focused tests passed: 9 passed, 1 existing Pydantic deprecation warning.
- Python compile check passed with external pycache path.
- Not run and reason:
- Full frontend lint fails on pre-existing unrelated `frontend/src/components/LandingNavbar.tsx` unused variable `to`.

## Completion State
- Current status:
- Code implementation for the agreed policy/terms/event-notice alignment is complete.
- Focused frontend/backend validation passed.
- No in-code TODO comments were added intentionally; remaining items are operational/legal decisions and are tracked in this handoff.
- Worktree note:
- `frontend/src/modules/Admin/AdminPortal.tsx` currently contains both this policy work and a separate admin OAuth login change from another agent.
- Treat this as a mixed-file staging concern, not a Git merge conflict. There are no conflict markers or unmerged index entries as of this handoff.
- When committing, stage `AdminPortal.tsx` by hunk:
  - Policy hunk: remove `platform_privacy_markdown`, keep only event participant notice template, and update policy-management copy.
  - OAuth hunk: Google OAuth redirect/import/button changes belong to the separate OAuth/dev-server work.

## Risks
- Known risks:
- Platform policy text still needs legal/operator confirmation for exact controller name, Supabase region, SMTP vendor, hosting region, and external organizer role.
- Existing production DB may still contain `platform_privacy_markdown`, but it is no longer the public source of truth after this change is deployed.
- The event-notice auto-upgrade only applies when the DB `consent_markdown` content matches a known built-in revision exactly; truly customized DB content remains untouched by design.
- Follow-up needed:
- Deploy frontend/backend together so Admin UI, public page, and compatibility API are consistent.
- Decide later whether to remove historical platform policy DB rows and backend platform-template helpers.

## Remaining Decisions / TODO
- Policy API cleanup:
- `GET /api/events/privacy-template` is still kept for compatibility, but it now returns code-defined static policy content.
- Product/engineering should decide later whether to remove this endpoint and any remaining platform-template helper code after confirming no clients depend on it.
- Production DB event notice:
- `/event/:slug/privacy` still renders the event-level DB `consent_markdown`.
- The old public `test-bingo` notice text was added as a built-in revision, so exact built-in matches auto-upgrade.
- If production `test-bingo` has customized or whitespace-modified `consent_markdown`, manually update that DB record to the latest participant notice template.
- Legal/operator confirmation:
- Confirm the final privacy controller/operator wording, contact email, Supabase project region, hosting region, SMTP provider, and external event-organizer role.
- Do not finalize processor, third-party provision, or cross-border transfer language until those operational facts are confirmed.
- Legal-policy review:
- Have the legal-policy agent review `/privacy`, `/terms`, and the default event participant notice against confirmed operations.
- Keep current/future processing separated: future experiment platform, recommendation, research/statistics, profiling, cross-event combination, sponsor/external organizer data sharing, or paid features need separate notice/consent/legal-basis review.
- Verification follow-up:
- Re-run full frontend lint after the unrelated `frontend/src/components/LandingNavbar.tsx` unused variable issue is resolved.
- After deployment, verify public pages and compatibility API with:
  - `/privacy`
  - `/terms`
  - `/api/events/privacy-template`
  - `/api/events/test-bingo/privacy-notice-template`

## Next Owner
- Owner: Product owner / legal-policy agent, with engineering support for commit split and deployment checks.
- Expected next action:
- Stage policy changes separately from the OAuth/dev-server work, then review the fixed platform privacy policy language against confirmed production operations and proceed with terms/event-notice finalization.
