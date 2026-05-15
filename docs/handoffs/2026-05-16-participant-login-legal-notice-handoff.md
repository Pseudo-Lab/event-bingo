# Agent Handoff

## Task Metadata
- Task ID: participant-login-legal-notice-2026-05-16

## Scope
- In scope:
  - Participant login legal checkbox copy and line-break behavior.
  - Event privacy notice modal and full-page legal navigation labels.
  - Public terms/privacy wording cleanup for Bingo Networking service naming.
  - Default backend policy template copy used for future participant notice rendering.
- Out of scope:
  - Event, participant, bingo board, or auth schema changes.
  - Caddy local development routing changes.
  - OAuth client configuration changes.

## Workspace
- Worktree path: `/home/ubuntu/.openclaw/workspace-bingo`
- Branch: `codex/legal-copy-cleanup`
- Base: `origin/main`

## Inputs Used
- Source docs:
  - `docs/reference/agent-collaboration.md`
  - `docs/reference/design-guide.md`
- Additional constraints:
  - Use Bingo Networking as the service name.
  - Keep DevFactory service operations team as the service operator.
  - Avoid exposing PseudoLab/PseudoCon/gajji wording in user-facing flows.
  - Keep the service privacy policy and event participant notice as separate surfaces.

## Changes Made
- Files changed:
  - Backend default policy template and public policy response message.
  - Frontend participant login legal copy, modal footer, event privacy page header actions.
  - Public terms/privacy wording.
  - Bingo page header brand cleanup.
  - Admin policy wording and test fixtures.
- Behavior changes:
  - Participant login now uses shorter legal text: `개인정보처리방침` and `행사별 개인정보 안내`.
  - Event privacy modal keeps only `전체 안내 보기` plus close.
  - Event privacy full page keeps only `행사 페이지로 돌아가기`.
  - Public privacy page is titled `Bingo Networking 개인정보처리방침`.
  - Existing Supabase `consent_markdown` template was manually updated after backup to remove old `플랫폼 개인정보처리방침` wording.

## Validation
- Tests run:
  - `npm run lint`
  - `npm run build`
  - `npx playwright test e2e/home.smoke.spec.ts e2e/landing-page.spec.ts`
  - `npx playwright test e2e/admin-event-settings.spec.ts`
  - `PYTHONPATH=app /tmp/event-bingo-backend-venv/bin/pytest app/tests/test_event_routes.py app/tests/test_policy_template_defaults.py`
- Results:
  - Passed.
- Not run and reason:
  - Full backend suite not run; changed backend surface was limited to policy template defaults and event policy response wording.

## Risks
- Known risks:
  - The DB data update is not represented in Git history. Backup was saved at `/tmp/event-bingo-consent-template-backup-20260516-050815.md`.
  - Earlier built-in backend policy template constants still contain legacy wording for built-in template detection.
- Follow-up needed:
  - If production has an existing customized participant notice template, update it separately through the admin policy editor or a controlled data migration.

## Next Owner
- Owner: product-owner / qa
- Expected next action:
  - Review PR copy changes and confirm whether current DB template wording should also be applied in production.
