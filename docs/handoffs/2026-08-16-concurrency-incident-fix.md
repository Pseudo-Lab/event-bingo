# Event BINGO concurrency incident fix handoff

## Task Metadata
- Task ID: 2026-08-16-concurrency-incident-fix
- Local verification update: 2026-09-14 (KST). Current acceptance target is **200 concurrent participants**, superseding the earlier 50-user plan. Current work is local only; no new commit, push, merge, deployment or production access is authorized.

## Scope
- In scope: bounded backend database pooling and lifecycle, Realtime-first interaction synchronization with polling recovery, participant-search request control, Supabase Auth bridge single-flight/rate-limit handling, secure JWT-to-participant mapping, automated regression coverage, rollout guidance.
- Out of scope: applying Supabase or GitOps settings, secret or compute changes, creating a staging environment, and production database changes outside the reviewed Realtime migration.

## Workspace
- Worktree path: `/home/ubuntu/code/workspace-bingo-concurrency`
- Branch: `fix/incident-20260816-concurrency`
- Base: `origin/main` at `1c9bc119e00185b00b7b0d49b0a701e24baf5008`

## Inputs Used
- Source docs: `AGENTS.md`, `docs/reference/agent-collaboration.md`
- Incident inputs: root-workspace `handoff.md`, `Logs-2026-08-16 20_32_20.txt`
- Incident evidence: 181 Supavisor `EMAXCONN` records, 178 HTTP 500 responses, and a peak of approximately 23.2 RPS during the 2026-08-16 failure window.

## Root Cause
- The backend used `NullPool`, so request bursts repeatedly opened Supavisor clients without an application-side concurrency ceiling.
- The yielded session dependency swallowed SQLAlchemy exceptions, which obscured failures, and the application lifespan did not dispose the engine.
- Every active game browser issued two state requests every five seconds, creating about 20 RPS at 50 continuously active clients before other traffic.
- Participant search could leave superseded requests running, while Google login/session restoration could initialize the same bridge concurrently and burst `PUT /auth/v1/user` calls.

## Changes Made
- Backend database sessions now use `async_sessionmaker` directly with a bounded async engine pool. Defaults are `pool_size=3`, `max_overflow=1`, `pool_timeout=5`, `pool_recycle=300`, pre-ping, and LIFO; the first three values are environment-overridable.
- Session failures now roll back and re-raise. Lifespan shutdown disposes the engine, including startup-failure cleanup.
- Default maximum application pool clients are calculated as `replicas × workers × (pool_size + max_overflow)`. With the current two replicas and two workers, the ceiling is `2 × 2 × (3 + 1) = 16`.
- Active game polling now uses a 10-second base interval plus stable per-client jitter from 0–2 seconds, pauses while the document is hidden, immediately refreshes after visibility returns, preserves the in-flight guard, and backs off up to 60 seconds after failures.
- Participant search now rejects fewer than two characters, retains its 300 ms debounce, aborts superseded requests, and caches successful identical queries for 15 seconds. The backend query contract now also enforces two characters.
- Google bridge initialization is single-flight per Supabase user/event. Matching metadata updates are skipped, and first-time metadata persistence retries 429 responses after bounded 250 ms and 500 ms delays.
- Polling E2E timing assertions were aligned with the new 10–12-second state-sync contract.
- Realtime is runtime feature-flagged by `/runtime/runtime-config.json`, defaults to `false`, refreshes every 15 seconds and on tab visibility recovery, and fails closed to polling when the file is unavailable or invalid. Production must mount a k3s projected ConfigMap directory at `/usr/share/nginx/html/runtime` for an image rebuild- and Pod restart-free switch. Do not use a `subPath` file mount because Kubernetes does not live-update ConfigMap subPath mounts.
- An authenticated game subscribes to `INSERT` changes using separate `send_user_id` and `receive_user_id` filters for the backend-confirmed participant ID.
- A Realtime event triggers authoritative API reconciliation instead of applying the database payload directly. Events arriving during an in-flight refresh are coalesced into one follow-up refresh. Hidden tabs defer API reconciliation until visibility recovery.
- While Realtime is subscribed, safety polling runs every 60 seconds. Before subscription or after `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`, or session lookup failure, the existing 10–12-second polling path remains active.
- Realtime logs identifier-free structured console metrics for channel status, channel join duration, reconnect count, commit-to-client delivery duration, and reconciliation errors. The load harness aggregates delivery p50/p95/p99; production collection still requires an Ops-approved browser telemetry sink if central retention is required.
- Auth bridge endpoints optionally verify the Supabase bearer token and use its signed top-level email and `sub`. Registration and exact legacy-login matches persist `sub` in `bingo_user.provider_id`; invalid supplied bearer tokens fail closed instead of falling back to request identity.
- Online Alembic execution uses a transaction-scoped advisory lock and fails fast when another migration is running, allowing the failed init container to retry after the owner completes.
- The proposed Alembic migration validates confirmed email matches and normalized `auth.users` uniqueness, records each exact change in `bingo_realtime_identity_backfill_audit`, verifies expected and updated counts, performs the one-time backfill, adds a nullable partial `provider_id` index, creates a hardened participant-ownership helper and authenticated SELECT policy, and conditionally adds `public.bingo_interaction` to `supabase_realtime`. It does not add a UNIQUE constraint because one authenticated account can own event-specific participant rows.
- Receiver-board updates and directional duplicate checks now run under a receiver-only row lock until history and board commit together. Concurrent writes previously lost board marks or received counts. History remains the duplicate source of truth even when an exchange changes no cells (issue #81).
- Password hashing/verification runs in the framework thread pool. Login releases its read transaction before bcrypt, then locks and rechecks the current password hash before identity linking. Hash strength and identity-relink rejection are unchanged.
- `npm run load-test:realtime` prepares 200 authenticated participants by default, staggers both login and channel joins at five users/second, runs independent per-participant exchange loops every 30 seconds, performs full-history API reconciliation, and checks authenticated/anonymous RLS. It matches exact expected deliveries and reconciled IDs, so unrelated events cannot conceal missing state and interrupted tests cannot pass. This external harness has not been run against Supabase; its pure metric tests do not validate native channel behavior.
- `backend/scripts/local_capacity_test.py` provides isolated real-HTTP/local-PostgreSQL load and final board/history/count verification, without Supabase Auth or WebSockets. See `backend/TESTING.md` for the command and limitations.

## Validation
- Backend including guarded local DB integration: 169 passed, 1 pre-existing Pydantic deprecation warning. New deterministic competing-transaction tests cover two distinct senders and duplicate same-sender attempts; the distinct-sender case failed before the lock fix.
- Historical baseline: GitHub Actions `Backend DB Integration` passed against the guarded PostgreSQL service. No GitHub workflow was triggered for these uncommitted local changes.
- Frontend unit: `npm test -- --run` — 119 passed.
- Frontend lint: `npm run lint` — passed.
- Frontend build/type check: `npm run build` — passed; existing large-chunk warning remains.
- Frontend E2E: `npm run e2e` — 19 passed.
- Prior local runtime-image check: Docker image build passed; the baked runtime JSON defaults to `false` and Nginx returned explicit no-cache headers. Production ON/OFF requires the Ops-managed projected ConfigMap. No image was deployed during this capacity check.
- Load harness metrics: `npm run test:realtime-load` — 13 passed. Actual Supabase 200-user verification remains gated on synthetic credentials, verified project capacity and an approved window.
- Realtime migration: isolated Supabase-shaped PostgreSQL 16 schema — advisory-lock collision rejected, retry upgrade passed, three event-specific users backfilled and audited, RLS negative test passed, publication/policy/function/index verified, exact audited restore passed, and re-upgrade passed. Downgrade preserves the pre-existing RLS state, provider index, audit rows, and linked data while removing the Realtime publication/policy/function path. A clean full-chain run remains blocked by a pre-existing duplicate `events.expected_attendee_count` migration outside this change.
- `git diff --check` — passed.
- Not run: 200-client/10-minute Supabase/production test and production-shaped participant-search `EXPLAIN (ANALYZE, BUFFERS)`. Production synthetic credentials and an approved test window were not supplied. Native channel authorization/reconnect behavior of the external harness is not yet verified.

## Rollout And Rollback

### Local 200-user result (2026-09-14)

- Environment: shared 4-CPU local host, disposable PostgreSQL 16, four Uvicorn workers, default pool 3/1/5. No concurrent build/test commands during the measured run.
- Sustained duration: 600.10 seconds; total including login, bursts and final checks: 652.15 seconds.
- Created exchanges: 4,209 (225 initial/contended exchanges and 3,984 sustained exchanges).
- HTTP/transport/application errors: 0. Final history ID, duplicate-history, receiver-count, marked-word and database-row mismatches: 0.
- Peak database connections: 16 (observer connection excluded).
- Sustained HTTP p95: 63.40 ms; sustained exchange p95/p99: 72.48/100.02 ms.
- Simultaneous 200-exchange burst p95/p99: **2,675.08/3,708.67 ms**. Burst board/history p95: 2,369.21/2,419.76 ms.
- Twenty-five senders targeting the same receiver: exchange p95 615.47 ms.
- **Overall local gate: FAIL** because burst endpoints exceeded the conservative 1,000 ms HTTP p95 threshold. Sustained capacity and final integrity passed; this is not a 200-user production readiness claim. The local HTTP threshold is separate from the proposed Supabase commit-to-delivery p95 target.
- Full result: `/tmp/event-bingo-200-20260914.5vX86d/200-ten-minutes.json`; server log: `/tmp/event-bingo-capacity-nb0kmdtg/backend.log`. Temporary artifacts are local and not committed.
- Cleanup: the runner stopped its owned Uvicorn workers. The disposable `event-bingo-200-db-20260914` container and synthetic databases were removed after the final 169-test regression pass; they can be regenerated, not restored from a retained DB backup. Existing development services and the root workspace's user files were left untouched.
- Diagnostic caveats: discard the initial run with only one surviving worker and the run overlapping a frontend build. Earlier shared-client HTTPX results are not comparable to the final per-participant HTTP pools. Final verification uses batches of 20; the actual burst still uses all 200 participants. Idle client connections expire before the server's keep-alive deadline; transport failures are counted, not retried away.
- Before the receiver-lock fix, the deterministic concurrent transaction regression failed and a short four-worker diagnostic had a received-count mismatch. Do not use the before/after smoke runs as a performance comparison because the load-client setup changed.
- Out-of-order commit reproduction: transaction A allocated interaction ID 1, transaction B allocated ID 2 and committed first, the first incremental poll observed only ID 2, then transaction A committed. A subsequent `interaction_id > 2` query returned no rows even though full history contained IDs 1 and 2. The unsafe cursor parameter was removed from the backend route/model and frontend API, and the game now performs full-history reconciliation with ID-based merge so the late lower ID is retained. Unit and E2E coverage verify the lower-ID merge and absence of the cursor during reconciliation.
- After that fix, the full-history 200-user/10-minute run created 4,208 exchanges with zero request errors or final state mismatches. Peak DB connections remained 16. Sustained overall p95 was 67.98 ms; exchange p95/p99 was 79.50/115.40 ms and history p95/p99 was 64.68/107.28 ms. Compared with the prior cursor run, sustained overall p95 increased from 63.40 ms by 4.58 ms. Aggregate result: `/tmp/event-bingo-full-history-10m.json` (local only, not committed).
- The corrected full-history run still failed only the artificial simultaneous-burst latency gate: 200 exchange p95/p99 was 2,808.91/2,986.31 ms. A short pool 5/1 comparison raised peak connections from 16 to 24 but changed burst exchange p95 only from 2,500.32 ms (pool 3/1 short run) to 2,493.32 ms. Do not increase the production pool on this evidence; connection count was not the primary cause of this local burst result.
- Remaining local work: if sub-second response to 200 exchanges issued at the same instant is a release requirement, attribute the burst delay to worker CPU/scheduling, SQL round trips and reconciliation amplification before changing application or topology. The realistic staggered 200-active-user path passed, but the actual Supabase 200-client gate remains mandatory.

### Proposed operational steps (not executed)

- Roll out the backend and frontend together because the API search minimum and polling behavior are coordinated contract changes.
- Keep the current GitOps mitigation at two replicas and two workers. Set `DB_POOL_SIZE=3`, `DB_MAX_OVERFLOW=1`, and `DB_POOL_TIMEOUT_SECONDS=5` explicitly in GitOps even though these are application defaults.
- Use a rolling deployment with readiness checks. During rollout, watch HTTP 5xx, `EMAXCONN`, Supabase Auth 429, p50/p95/p99 latency, and backend CPU throttling.
- Before full traffic, run at least 200 active clients for 10 minutes and require zero `EMAXCONN`, less than 1% HTTP 5xx, and preserved board/interaction synchronization. Verify project quotas with headroom for staff, extra tabs, reconnect overlap and the anonymous negative-test connection; do not assume a limit of exactly 200 is sufficient.
- Before enabling the frontend flag, apply and verify the database migration: confirmed-email backfill count, `auth.uid()`/JWT `sub` mapping, participant-only SELECT negative tests, and `bingo_interaction` publication membership. Never expose a service-role key in the browser.
- Runtime flag OFF is the default. Change the mounted runtime JSON to `{"bingoRealtimeEnabled":true}` only after the 1–3-user gate; clients observe it within 15 seconds. Revert it to `false` first during rollback.
- Enable Realtime gradually. Require zero unauthorized rows, channel errors/timeouts, missed or duplicate final state, Auth 429, and `EMAXCONN`; target p95 delivery under one second unless Product/QA defines another threshold.
- Roll back Realtime first by disabling the frontend feature flag and returning to polling. Retain the bounded DB pool. Remove publication/policy/function only after traffic is stable; do not reverse the verified `provider_id` backfill, and do not disable the table's pre-existing RLS state.
- If a proven backfill error requires targeted restoration, use only audited rows whose current provider still matches the assigned provider; never bulk-null `provider_id`:

```sql
UPDATE public.bingo_user AS app_user
SET provider_id = audit.previous_provider_id,
    auth_provider = audit.previous_auth_provider
FROM public.bingo_realtime_identity_backfill_audit AS audit
WHERE audit.migration_revision = 'a8e6d4c2b190'
  AND audit.bingo_user_id = app_user.user_id
  AND app_user.provider_id = audit.assigned_provider_id;
```

- The actual Realtime policy name is `bingo_interaction_select_own`. Manual DB-path rollback must drop that policy before dropping `public.is_current_bingo_user(integer)`. Keep RLS, `ix_bingo_user_provider_id`, audit rows, verified backfill data, and pool settings unless a separately approved data restoration is required.

```sql
BEGIN;

DROP POLICY IF EXISTS bingo_interaction_select_own
ON public.bingo_interaction;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'bingo_interaction'
    ) THEN
        ALTER PUBLICATION supabase_realtime
            DROP TABLE public.bingo_interaction;
    END IF;
END
$$;

DROP FUNCTION IF EXISTS public.is_current_bingo_user(integer);

COMMIT;
```
- Roll back both application images to `sha-1c9bc11` if error rate or state-sync regressions exceed the gate. Do not revert GitOps hotfix `60f93b6`; retain two replicas/two workers during rollback.

## Risks
- Known risks: Realtime cannot work in production until publication membership, RLS policy, and identity backfill are applied; no staging Supabase environment exists; browser Realtime metrics are not centrally retained; application metrics do not expose SQLAlchemy pool use or dedicated Auth 429/`EMAXCONN` counters; the 60-second recovery poll still makes two requests; the production load-test gate remains open.
- Follow-up needed: Ops-reviewed database migration and GitOps pool values, approved isolated synthetic-event 200-client load/authorization tests, Supabase project/key-role and quota verification, multi-worker Prometheus verification, Loki retention/alerts, and production-shaped search `EXPLAIN`. Pool 3/1/5 is a bounded starting point, not a demonstrated 200-user production capacity guarantee.

## Next Owner
- Owner: Product Owner for rollout authorization; Backend/Frontend for application changes; Ops for Supabase/GitOps application; QA for the release gate.
- Expected next action: complete local 200-user diagnosis first. Only after separate user authorization, Ops reviews the migration, projected runtime ConfigMap, exact rollback SQL and explicit pool values; QA/Ops runs 1–3, 10, 50, 100, then 200-client/10-minute gates during the approved no-event window. No rollout is authorized by this handoff alone.

## Local Realtime Load Command

Keep the synthetic user JSON outside the repository. Each array item must contain `email`, `password`, `bingo_login_id`, and `bingo_password`. Do not attach that file to the PR or handoff.

```bash
LOAD_TEST_SUPABASE_URL=<production-supabase-url> \
LOAD_TEST_SUPABASE_ANON_KEY=<production-publishable-key> \
LOAD_TEST_API_URL=<production-api-url> \
LOAD_TEST_EVENT_SLUG=<synthetic-event-slug> \
LOAD_TEST_USERS_FILE=<absolute-secret-json-path> \
LOAD_TEST_USER_COUNT=200 \
LOAD_TEST_DURATION_MS=600000 \
LOAD_TEST_LOGIN_RATE_PER_SECOND=5 \
LOAD_TEST_EXCHANGE_INTERVAL_MS=30000 \
LOAD_TEST_RESULT_FILE=<absolute-result-json-path> \
npm run load-test:realtime
```

Optional tuning variables are `LOAD_TEST_SETTLE_MS` and `LOAD_TEST_EXCHANGE_INTERVAL_MS` (per participant, not a global write rate). The result file is created with mode `0600` and contains aggregate metrics only. Synthetic participants must already have event boards with selected words. The command connects to the specified external environment: do not run it without separate approval.
