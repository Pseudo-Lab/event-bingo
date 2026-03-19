## Task Metadata
- Task ID: 2026-03-19-traefik-api-prefix-fix

## Scope
- In scope:
  - Fix deployed API routing for `/api/auth/bingo/register` and related `/api/*` backend paths
  - Update Docker Compose Traefik labels only
- Out of scope:
  - Backend route refactors
  - Frontend API contract changes

## Inputs Used
- Source docs:
  - `AGENTS.md`
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - Keep the smallest-impact fix
  - Deployment/runtime topology changes require handoff metadata

## Changes Made
- Files changed:
  - `docker-compose.yaml`
  - `docs/handoffs/2026-03-19-traefik-api-prefix-fix.md`
- Behavior changes:
  - Removed the Traefik `StripPrefix(/api)` middleware from the backend router
  - Requests matching `Host(bingo.pseudolab-devfactory.com) && PathPrefix(/api)` now reach FastAPI with the `/api` prefix intact

## Validation
- Tests run:
  - `docker compose -f docker-compose.yaml config`
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_auth_routes.py`
- Results:
  - Compose config rendered successfully
  - Auth route test passed
- Not run and reason:
  - Live deployment verification was not run from this workspace

## Risks
- Known risks:
  - If the deployed environment uses separate ingress or GitOps manifests outside this repository, the same prefix behavior must match there as well
- Follow-up needed:
  - Confirm the deployment picked up the updated compose labels and verify `/api/auth/bingo/register` in production

## Next Owner
- Owner:
  - Infra(lead) or deploy owner
- Expected next action:
  - Deploy the updated compose configuration and validate the production route
