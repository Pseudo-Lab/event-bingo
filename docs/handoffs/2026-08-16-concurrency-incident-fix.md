# Event BINGO concurrency incident fix handoff

## Task Metadata
- Task ID: 2026-08-16-concurrency-incident-fix

## Scope
- In scope: bounded backend database pooling and lifecycle, active-game polling pressure, participant-search request control, Supabase Auth bridge single-flight/rate-limit handling, automated regression coverage, rollout guidance.
- Out of scope: Supabase secret or compute changes, GitOps topology changes, the P1 combined state-sync/realtime endpoint, and production database index changes without production-shaped `EXPLAIN` evidence.

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

## Validation
- Backend: `PYTHONPATH=app /tmp/event-bingo-concurrency-venv/bin/pytest -q` — 157 passed, 2 DB integration tests skipped, 1 pre-existing Pydantic deprecation warning.
- Frontend unit: `npm test` — 109 passed.
- Frontend lint: `npm run lint` — passed.
- Frontend build/type check: `npm run build` — passed; existing large-chunk warning remains.
- Frontend E2E: `npm run e2e` — 19 passed.
- `git diff --check` — passed.
- Not run: guarded backend DB integration tests, 50-client/10-minute staging load test, and production-shaped participant-search `EXPLAIN (ANALYZE, BUFFERS)`. No safe staging database target or credentials were supplied.

## Rollout And Rollback
- Roll out the backend and frontend together because the API search minimum and polling behavior are coordinated contract changes.
- Keep the current GitOps mitigation at two replicas and two workers. Set `DB_POOL_SIZE=3`, `DB_MAX_OVERFLOW=1`, and `DB_POOL_TIMEOUT_SECONDS=5` explicitly in GitOps even though these are application defaults.
- Use a rolling deployment with readiness checks. During rollout, watch HTTP 5xx, `EMAXCONN`, Supabase Auth 429, p50/p95/p99 latency, and backend CPU throttling.
- Before full traffic, run 50 active clients for 10 minutes and require zero `EMAXCONN`, less than 1% HTTP 5xx, and preserved board/interaction synchronization.
- Roll back both application images to `sha-1c9bc11` if error rate or state-sync regressions exceed the gate. Do not revert GitOps hotfix `60f93b6`; retain two replicas/two workers during rollback.

## Risks
- Known risks: application metrics do not yet expose SQLAlchemy checked-out/overflow/wait values or dedicated Auth 429/`EMAXCONN` counters; production-shaped search plans and index needs remain unverified; polling still makes two requests per cycle; the load-test acceptance gate remains open.
- Follow-up needed: staging load test and latency report, safe production-shaped search `EXPLAIN`, pool/route/Auth observability, and P1 combined state-sync or realtime evaluation.

## Next Owner
- Owner: QA, then Infra/GitOps lead for staged rollout.
- Expected next action: run the missing DB integration and 50-client staging tests, attach metrics/latencies to the PR, set explicit pool environment values in `Pseudo-Lab/DevFactory-Ops`, and approve rollout only if all incident gates pass.
