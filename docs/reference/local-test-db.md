# Local Test Database Guide

## Purpose
Use a disposable local database for automated integration tests. Do not run destructive automated tests against the production Supabase database.

## Environment Boundaries
- Production deploy is managed through k8s and ArgoCD in `Pseudo-Lab/DevFactory-Ops`; Docker Compose is not a production deployment source.
- `docker-compose.dev.yaml` is for human local development and manual screen checks.
- `docker-compose.test.yaml` is for automated tests that may reset schema and delete data.
- The production Supabase database must not be used with `ENV=test`, `TEST_DB_URL`, or DB reset fixtures.

## Test Database
Start the local test database:

```bash
docker compose -f docker-compose.test.yaml up -d postgres-test
```

Use this URL from the host machine:

```bash
export ENV=test
export TEST_DB_URL=postgresql+asyncpg://event_bingo_test:event_bingo_test@127.0.0.1:55432/event_bingo_test
```

Run DB-backed backend tests:

```bash
cd backend
PYTHONPATH=app /tmp/event-bingo-backend-venv/bin/pytest --run-db-integration app/tests/test_bingo_interaction_db_integration.py
```

Clean up the disposable database:

```bash
docker compose -f docker-compose.test.yaml down -v
```

## Safety Rules
- DB integration fixtures must require `ENV=test`.
- DB integration fixtures must only reset a database named `event_bingo_test` on `localhost`, `127.0.0.1`, `::1`, or `postgres-test`.
- Keep test data isolated from development and production data.
- If a test needs destructive setup, add it only to the test database path.

## Current Pilot-Service Test Scope
- Bingo service: mobile viewport is mandatory.
- Admin page: desktop viewport is mandatory.
- Homepage: mobile and desktop viewports are mandatory.
- Realtime is the target for offline event operation, but polling or refresh fallback may be accepted when explicitly documented.

## Issue 81 Regression Rule
Keyword exchange must always preserve interaction history because operators need to know who met whom.

When receiver board cells can be updated, the same exchange must persist both:
- a `bingo_interaction` row
- the receiver board status and interaction marker

When no receiver board cell can be updated, the exchange is still successful and must preserve history without mutating board cells.
