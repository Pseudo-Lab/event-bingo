## Task Metadata
- Task ID: 2026-03-22-gitops-app-handoff

## Scope
- In scope:
  - Prepare `event-bingo` images for GHCR-based GitOps deployment
  - Add repository-side CI for frontend and backend container publishing
  - Automate Ops manifest tag updates after image publish
  - Document the runtime contract that Ops needs for k3s/ArgoCD onboarding
- Out of scope:
  - Manual cluster operation changes outside GitOps (direct kubectl patch/hotfix as deployment source)
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
  - `backend/requirements.txt`
  - `frontend/Dockerfile`
  - `backend/.dockerignore`
  - `frontend/.dockerignore`
  - `docs/handoffs/2026-03-22-gitops-app-handoff.md`
- Behavior changes:
  - Docker Compose deployment workflow is now manual-only via `workflow_dispatch`
  - `main` pushes build and publish `ghcr.io/pseudo-lab/event-bingo-backend` and `ghcr.io/pseudo-lab/event-bingo-frontend`
  - GHCR pipeline now runs `build-amd64` and `build-arm64` in parallel, then merges multi-arch manifests to `sha-<short_sha>` and `latest`
  - Workflow uses `concurrency` (`cancel-in-progress: true`) so only the latest run per branch continues
  - Workflow updates `DevFactory-Ops/services/event-bingo/overlays/prod/kustomization.yaml` automatically after successful image publish
  - GHCR image name normalization to lowercase is enforced in workflow to avoid invalid-tag failures
  - Backend container now starts with `alembic upgrade head && python app/start.py` by default, which makes the image runnable in Kubernetes without a compose-specific command override
  - Docker build caching was improved:
    - frontend: `npm ci` and BuildKit npm cache mount
    - backend: BuildKit pip cache mount

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
- Ops automation prerequisite:
  - `OPS_REPO_TOKEN` in `event-bingo` repository secrets must have write access to `Pseudo-Lab/DevFactory-Ops` (`contents:write`; SSO authorization if org policy requires)
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
- Pipeline and deployment checks:
  - GitHub Actions `ghcr-images.yaml` for commit `f17837f` completed successfully (`build-amd64`, `build-arm64`, `merge-manifest`, `Update Ops Manifest`)
  - Production deployments reference the expected image tags:
    - `event-bingo-frontend`: `ghcr.io/pseudo-lab/event-bingo-frontend:sha-f17837f`
    - `event-bingo-backend`: `ghcr.io/pseudo-lab/event-bingo-backend:sha-f17837f`
  - Production pods resolved and ran the corresponding image digests:
    - backend digest: `sha256:0c78089d2b9677e5699ef1664474898cc7a25eea64497f388a6e07a7ad9cfac0`
    - frontend digest: `sha256:e9d84297894aca8ce190115ac8388280d1c135d24a179ac1da57416f0be7d14b`
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
  - `build-arm64` still runs on emulation in GitHub-hosted runners, so ARM build duration can remain significantly slower than AMD64
  - `Update Ops Manifest` will fail if `OPS_REPO_TOKEN` loses permission or org SSO authorization
- Follow-up needed:
  - Consider moving ARM64 build to a native ARM runner for better build latency/cost
  - Confirm whether admin email settings are needed in production at first rollout

## Next Owner
- Owner:
  - Infra(lead) + Backend owner
- Expected next action:
  - Keep `OPS_REPO_TOKEN` permission/SSO state stable and monitor pipeline reliability
  - Plan Supabase migration and retire compose MySQL after data cutover

## Deployment Status Update
- Date:
  - 2026-03-22
- Status:
  - `event-bingo` GitOps deployment is connected, externally reachable, and auto-tag sync is operational
- Verified outcome:
  - `https://bingo.pseudolab-devfactory.com` access is working
  - `kustomization.yaml` image tags and running pod image digests match expected release (`sha-f17837f`)
- Current operating policy:
  - Keep compose MySQL (`event-bingo-db`) running until Supabase migration is completed
  - Decommission compose app containers (`event-bingo-frontend`, `event-bingo-backend`) to avoid dual-serving
- Remaining follow-up:
  - Plan and execute DB migration from compose MySQL to Supabase
