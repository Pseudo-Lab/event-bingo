# Backend Testing

## Local DB-backed integration tests

Automated integration tests must not use Supabase. Start the isolated local test database with:

```sh
docker compose -f docker-compose.test.yaml up -d postgres-test
```

Then run the DB-backed tests with:

```sh
cd backend
ENV=test TEST_DB_URL=postgresql+asyncpg://event_bingo_test:event_bingo_test@127.0.0.1:55432/event_bingo_test \
  PYTHONPATH=app /tmp/event-bingo-backend-venv/bin/pytest --run-db-integration app/tests/test_bingo_interaction_db_integration.py
```

The reset guard requires all of these conditions before dropping or recreating tables:

- `ENV=test`
- the database host is local (`localhost`, `127.0.0.1`, `::1`, or `postgres-test`)
- the database name contains `test`

The default development and production compose files do not start this database. Production deploys through k8s/ArgoCD and must keep using the production database connection outside this test flow.

## Local 200-user HTTP capacity check

Use a **new, empty local test database** for each run. The runner refuses an existing
`bingo_user` table; it does not reset it. Run from `backend` with the backend test
dependencies installed:

```sh
ENV=test TEST_DB_URL=postgresql+asyncpg://event_bingo_test:event_bingo_test@127.0.0.1:55432/event_bingo_capacity_test \
  /tmp/event-bingo-concurrency-venv/bin/python scripts/local_capacity_test.py \
  --users 200 --workers 4 --duration 600 --result /tmp/event-bingo-capacity-result.json
```

The result path must not already exist. The runner starts and stops its own local
Uvicorn processes and creates synthetic users, boards and interactions. It leaves
the synthetic database available for inspection; remove only that disposable
database/container when finished. No Supabase credentials are required.

The workload includes login at five users/second, simultaneous board/history reads
and exchanges, 25 senders targeting one receiver, then 200 independent participants
polling every 11 seconds and exchanging every 30 seconds for ten minutes. Successful
exchanges also trigger sender/receiver API refreshes. Final checks compare history
IDs, received counts, marked board words and total database rows.

JSON output separates burst and sustained latency, counts HTTP/transport/application
errors, and records peak database connections. The conservative local gate requires
zero errors or state mismatches and each measured endpoint/phase p95 at most 1,000 ms
(excluding final verification). `--duration 30` is a diagnostic smoke run, not the
ten-minute acceptance test. Do not run builds or other tests alongside a benchmark.

This is real backend HTTP against local PostgreSQL, **not** 200 browser sessions or
Supabase Auth/Realtime/Supavisor verification. Four workers on one shared host do not
reproduce two production Pods, their CPU limits, ingress or network. Production
Realtime delivery p95, RLS, quotas and recovery require a separately approved test.
