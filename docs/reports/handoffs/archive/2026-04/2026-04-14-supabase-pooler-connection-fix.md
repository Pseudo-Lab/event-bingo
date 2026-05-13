## Task Metadata
- Task ID: 2026-04-14-supabase-pooler-connection-fix

## Scope
- In scope:
  - Record the April 14, 2026 ArgoCD deployment failure and likely cause.
  - Capture recommended runtime/env checks for the next recurrence.
- Out of scope:
  - Application code changes
  - ArgoCD / GitOps manifest edits in `Pseudo-Lab/DevFactory-Ops`
  - Production secret rotation or immediate incident response

## Inputs Used
- Source docs:
  - `AGENTS.md`
  - Supabase docs / changelog on session mode `5432` and transaction mode `6543`
- Additional constraints:
  - Deployment error: `MaxClientsInSessionMode: max clients reached`
  - The deployment recovered without applying the local mitigation patch set.

## Changes Made
- Files changed:
  - `docs/handoffs/2026-04-14-supabase-pooler-connection-fix.md`
- Behavior changes:
  - No application behavior change was kept in the repo.
  - A local backend mitigation prototype was intentionally deferred after the rollout recovered.
  - This note is the only retained artifact for the issue.

## Validation
- Tests run:
  - `git diff` review for the Supabase pooler mitigation scope
- Results:
  - Confirmed the mitigation code/config changes were removed and only this handoff note remains for the deployment issue.
- Not run and reason:
  - No deployment-level verification was possible from this workspace.
  - No backend tests were needed because the code changes were not retained.

## Risks
- Known risks:
  - The issue can recur if runtime env still uses Supabase session-mode pooler `:5432` and startup spikes concurrent connections.
  - Recovery without a code change suggests the failure was load/timing sensitive, not permanently resolved.
- Follow-up needed:
  - Check ArgoCD runtime secret/env and confirm whether `DB_URL` points to `pooler.supabase.com:5432`.
  - If the issue repeats, prefer changing runtime env to a direct connection or Supabase transaction pooler `:6543`.
  - Consider separating Alembic migration execution from app pod startup in `Pseudo-Lab/DevFactory-Ops`.

## Next Owner
- Owner: infra/backend
- Expected next action:
  - Keep the note as a reference.
  - If the deployment error reappears, update Ops env first, then decide whether an app-level connection/pooling patch is still necessary.
