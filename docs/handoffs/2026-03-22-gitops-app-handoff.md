## Task Metadata
- Task ID: 2026-03-22-gitops-app-handoff

## Scope
- In scope:
  - Prepare `event-bingo` images for GHCR-based GitOps deployment
  - Add repository-side CI for frontend and backend container publishing
  - Document the runtime contract that Ops needs for k3s/ArgoCD onboarding
- Out of scope:
  - Any changes inside `/Users/soo/code/DevFactory-Ops`
  - Kubernetes manifests, ArgoCD applications, ingress, or sealed secret creation

## Inputs Used
- Source docs:
  - `AGENTS.md`
  - `docs/reference/project-requirements.md`
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - Keep current Docker Compose deployment available as a manual fallback
  - Prepare for GHCR image publishing without coupling the image to a single environment

## Changes Made
- Files changed:
  - `.github/workflows/docker-compose-up.yaml`
  - `.github/workflows/ghcr-images.yaml`
  - `backend/Dockerfile`
  - `backend/.dockerignore`
  - `frontend/.dockerignore`
  - `docs/handoffs/2026-03-22-gitops-app-handoff.md`
- Behavior changes:
  - Docker Compose deployment workflow is now manual-only via `workflow_dispatch`
  - `main` pushes build and publish `ghcr.io/pseudo-lab/event-bingo-backend` and `ghcr.io/pseudo-lab/event-bingo-frontend`
  - Backend container now starts with `alembic upgrade head && python app/start.py` by default, which makes the image runnable in Kubernetes without a compose-specific command override

## Runtime Contract For Ops
- Domain:
  - `bingo.pseudolab-devfactory.com`
- Routing:
  - `/` -> frontend service on port `80`
  - `/api` -> backend service on port `8000`
- Expected GHCR images:
  - `ghcr.io/pseudo-lab/event-bingo-frontend`
  - `ghcr.io/pseudo-lab/event-bingo-backend`
- Image tag strategy:
  - Immutable deploy tags: `sha-<short_sha>`
  - Rolling convenience tag on `main`: `latest`
- Suggested Kubernetes namespace:
  - `event-bingo`
- Frontend runtime/build inputs:
  - No mandatory secret required for image build
  - `VITE_API_URL` can remain unset for same-origin production routing
- Backend required runtime env:
  - `DB_URL`
  - `SWAGGER_USERNAME`
  - `SWAGGER_PASSWORD`
- Backend optional runtime env currently supported by app:
  - `ENV`
  - `ADMIN_JWT_SECRET`
  - `ADMIN_INVITE_URL_BASE`
  - `ADMIN_INVITE_TOKEN_EXPIRE_HOURS`
  - `ADMIN_SMTP_HOST`
  - `ADMIN_SMTP_PORT`
  - `ADMIN_SMTP_USERNAME`
  - `ADMIN_SMTP_PASSWORD`
  - `ADMIN_SMTP_FROM_EMAIL`
  - `ADMIN_SMTP_FROM_NAME`
  - `ADMIN_SMTP_USE_TLS`
  - `ADMIN_SMTP_USE_SSL`

## Validation
- Tests run:
  - `python3 -m compileall backend/app`
  - `git diff --check`
- Results:
  - Backend Python sources compiled successfully
  - No patch formatting or whitespace issues were reported
- Not run and reason:
  - `docker build -t event-bingo-backend:test ./backend` was not run because `docker` is not installed in this workspace
  - `docker build -t event-bingo-frontend:test ./frontend` was not run because `docker` is not installed in this workspace
  - `npm --prefix frontend run build` was not run because frontend dependencies are not installed in this workspace
  - GitHub Actions execution, live GHCR push, and k3s/ArgoCD deployment are owned by the repository and Ops environment

## Risks
- Known risks:
  - Current backend still expects `DB_URL` and existing SQLAlchemy/Alembic flow; Supabase transition may require a follow-up runtime contract update
  - If Ops wants image tags managed via Kustomize, the `services/event-bingo/overlays/prod/kustomization.yaml` image names must exactly match the GHCR names above
- Follow-up needed:
  - Create `DevFactory-Ops/services/event-bingo/{base,overlays/prod}` manifests
  - Add `apps/prod/services/event-bingo.yaml`
  - Add ingress and sealed secrets for `DB_URL` and Swagger credentials
  - Confirm whether admin email settings are needed in production at first rollout

## Next Owner
- Owner:
  - Ops agent / Infra(lead)
- Expected next action:
  - Onboard `event-bingo` into `DevFactory-Ops` using the runtime contract above and wire ArgoCD to the new GHCR images
