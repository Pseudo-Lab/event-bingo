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
