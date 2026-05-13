# Agent Handoff Template

## Task Metadata
- Task ID: 2026-04-15-bingo-privacy-notice-alignment

## Scope
- In scope:
- Align bingo login/privacy flow with a privacy-notice-first approach instead of a mandatory consent gate.
- Update backend policy template defaults, public policy endpoints, and related admin copy.
- Update frontend login, public privacy page, landing links, tests, and source-of-truth docs.
- Out of scope:
- Formal legal review by counsel.
- Google Cloud Console OAuth consent-screen configuration changes outside the repository.
- Data retention automation or historical data backfill for legacy `privacy_agreed` / `agreement_at` fields.

## Inputs Used
- Source docs:
- `docs/reference/service-user-flow.md`
- `docs/reference/design-guide.md`
- Additional constraints:
- Keep Korean mirrors in sync with English source docs.
- Preserve backward compatibility for the legacy `/api/events/consent-template` route while moving the app to `/api/events/privacy-template`.

## Changes Made
- Files changed:
- `backend/app/models/policy_template.py`
- `backend/app/models/user.py`
- `backend/app/api/auth/services/bingo_login.py`
- `backend/app/api/events/routes.py`
- `backend/app/api/events/schema.py`
- `backend/app/api/admin/routes.py`
- `backend/app/tests/test_event_routes.py`
- `frontend/src/api/public_event_api.ts`
- `frontend/src/modules/Home/Home.tsx`
- `frontend/src/modules/Home/Home.css`
- `frontend/src/modules/Home/ConsentDialog.tsx`
- `frontend/src/modules/Landing/PublicPrivacyPage.tsx`
- `frontend/src/modules/Landing/LandingHomePage.tsx`
- `frontend/src/modules/Admin/AdminPortal.tsx`
- `frontend/src/App.tsx`
- `frontend/src/utils/consentTemplate.ts`
- `frontend/e2e/home.smoke.spec.ts`
- `frontend/e2e/support/bingoApi.ts`
- `frontend/README.md`
- `docs/reference/service-user-flow.md`
- `docs/reference/service-user-flow.ko.md`
- `docs/reference/design-guide.md`
- `docs/reference/design-guide.ko.md`
- `docs/reference/privacy-compliance-guide.md`
- `docs/reference/privacy-compliance-guide.ko.md`
- Behavior changes:
- Removed the login-blocking privacy consent checkbox from the bingo home screen.
- Reworked the modal into a non-blocking privacy notice dialog and added a public `/privacy` page for a stable policy URL.
- Split the published privacy surfaces into a DevFactory platform policy at `/privacy` and an event-specific participant notice at `/event/:slug/privacy`.
- Linked the landing page to the public privacy page so the homepage exposes the policy URL.
- Stopped auto-marking users as privacy-agreed during bingo register/login flows.
- Added `/api/events/privacy-template` as the primary public endpoint and kept `/api/events/consent-template` as a hidden compatibility alias.
- Added `/api/events/{event_slug}/privacy-notice-template` so the event login flow renders organizer-specific participant notice text with the event team and contact email.
- Updated default policy text to explain internal processing, contract-performance basis for necessary processing, and separate handling for optional uses or third-party disclosures.
- Revised the built-in default policy to a conservative baseline: no commissioned processing disclosed by default, no overseas transfer disclosed by default, and a baseline retention rule of deletion within three years after event end unless separately justified.
- Updated the built-in default policy again for the planned production baseline that uses Supabase and SMTP-backed email delivery, while leaving explicit placeholders for the exact SMTP vendor and actual Supabase region facts.
- Updated the retention structure again so direct identifiers default to deletion/anonymization within one year after event end, while anonymized statistics and event archive content can be retained longer.
- Split policy template management so admins can edit the event-participant notice and the DevFactory platform policy separately.
- Added a startup-gated redaction helper for expired event personal data plus environment flags for retention days and startup execution.
- Added built-in template revision detection so older shipped default policy text is automatically upgraded, while admin-customized templates remain untouched.
- Auto-upgrade the stored template when the database still contains the old built-in consent default, while leaving admin-customized templates untouched.
- Removed `AgreedAt` from the admin attendance CSV export so the export no longer implies fresh consent capture.
- Added repo-level privacy compliance notes that document the current gaps around controller identity centralization, processor verification, overseas transfer verification, and retention enforcement.

## Validation
- Tests run:
- `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_event_routes.py backend/app/tests/test_policy_template_defaults.py backend/app/tests/test_admin_console_services.py`
- `npm run test -- src/utils/consentTemplate.test.ts`
- `npm run build`
- `npm run e2e -- home.smoke.spec.ts`
- `npm run lint`
- Results:
- All passed.
- Not run and reason:
- Full backend/frontend suites were not run to keep validation focused on the changed privacy/login surfaces.

## Risks
- Known risks:
- The database still contains legacy `privacy_agreed` / `agreement_at` columns and historical values; this change stops relying on them but does not remove or migrate old data.
- The default privacy notice now states policy-level retention principles, but actual deletion scheduling and retention enforcement are not implemented in code.
- The public `/privacy` route exists, but the Google Cloud OAuth consent screen homepage/privacy-policy URLs must still be updated manually in Google Cloud Console.
- The event participant notice currently derives the organizer identity from `event_team` and the contact channel from `admin_email`; if production requires a legal entity name or a separate privacy contact, the event model/admin form still needs to be extended.
- The default policy text now uses a conservative baseline, but it still requires a manual review of the real controller identity, real processor list, and real overseas-transfer facts before production publication.
- The latest default policy assumes Supabase and SMTP-backed email delivery, but it still requires manual replacement of the SMTP vendor placeholder and confirmation of the actual Supabase region before production publication.
- The code now includes an expired-event redaction helper, but it only runs automatically when `PRIVACY_REDACTION_RUN_ON_STARTUP=true` is enabled in the runtime environment.
- The current environment example references Supabase infrastructure outside Korea, so overseas transfer review may still be required at deployment time.
- The event participant notice now states deletion/anonymization of direct identifiers within one year after event end, but operators still need to enable and verify the redaction workflow in production.
- Follow-up needed:
- Confirm the final notice wording with legal counsel or the product owner responsible for privacy/legal review.
- Decide whether to deprecate and later remove the legacy consent columns and any related historical admin/reporting usage.
- Configure Google Cloud OAuth consent screen to use the deployed homepage URL and deployed `/privacy` URL.

## Next Owner
- Owner: product-owner / infra
- Expected next action:
- Review the updated privacy wording, confirm the deployed public policy URL, and update Google OAuth consent-screen settings to point at the production homepage and `/privacy`.
