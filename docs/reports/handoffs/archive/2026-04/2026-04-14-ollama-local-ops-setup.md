> Status: deferred on 2026-04-14. The runtime/manifests were reverted from code/config and this note is being kept as a future reference only.

## Task Metadata
- Task ID: 2026-04-14-ollama-local-ops-setup

## Scope
- In scope:
  - Add local Ollama `qwen3:4b` wiring to `docker-compose.dev.yaml`
  - Add `event-bingo` Ollama deployment manifests in `DevFactory-Ops`
- Out of scope:
  - Changing backend AI prompt logic
  - ArgoCD secret rotation or image automation changes

## Inputs Used
- Source docs:
  - `docs/reference/project-requirements.md`
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - CPU-only runtime target
  - Keep existing rule-based keyword fallback intact
  - Ops manifests live in `DevFactory-Ops`

## Changes Made
- Files changed:
  - App repo:
    - `docker-compose.dev.yaml`
  - Ops repo:
    - `services/event-bingo/base/backend-deployment.yaml`
    - `services/event-bingo/base/kustomization.yaml`
    - `services/event-bingo/base/ollama-deployment.yaml`
    - `services/event-bingo/base/ollama-service.yaml`
    - `services/event-bingo/base/ollama-pvc.yaml`
- Behavior changes:
  - Local dev compose now starts an `ollama` service, pulls `qwen3:4b`, and waits for the model to exist before backend starts.
  - Production manifests now include a dedicated `event-bingo-ollama` deployment/service/PVC.
  - Backend in production is wired to `http://event-bingo-ollama:11434` through explicit env vars.
  - Ollama image is pinned to `0.6.6` in local and ops config, based on the locally validated runtime version.

## Validation
- Tests run:
  - `docker compose -f docker-compose.dev.yaml config`
  - `docker compose -f docker-compose.dev.yaml up -d ollama`
  - `docker compose -f docker-compose.dev.yaml ps ollama`
  - `docker compose -f docker-compose.dev.yaml logs --tail=120 ollama`
  - `kubectl kustomize /Users/skkim/Documents/pseudolab/DevFactory-Ops/services/event-bingo/overlays/prod`
- Results:
  - Compose config rendered successfully.
  - Local `ollama` container started and `qwen3:4b` download began successfully.
  - `kubectl kustomize` rendered the updated production manifests successfully.
- Not run and reason:
  - Full backend-to-Ollama keyword recommendation E2E was not run against the live local stack because the model download was still in progress.

## Risks
- Known risks:
  - CPU-only `qwen3:4b` may need resource tuning depending on the cluster node size.
  - PVC assumes a default storage class exists in the cluster.
- Follow-up needed:
  - Verify ArgoCD sync and runtime resource headroom in production

## Next Owner
- Owner: Infra(lead) / Backend
- Expected next action:
  - Review the new `DevFactory-Ops` manifests, sync in ArgoCD, and validate the AI keyword recommendation endpoint end-to-end.
