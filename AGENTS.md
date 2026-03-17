# Event Bingo Project Agents

## Product Goals
- Help organizers create events quickly.
- Support configurable bingo settings for each event.
- Provide event-level analytics and report outcomes.
- Run DB and login through Supabase.

## Source Of Truth
- Primary planning reference: `docs/reference/project-requirements.md`
- Primary service-flow reference: `docs/reference/service-user-flow.md`
- UI design guide: `docs/reference/design-guide.md`
- Agent collaboration protocol: `docs/reference/agent-collaboration.md`
- English guides (`*.md`) are implementation source-of-truth.
- When an English guide changes, update its Korean mirror (`*.ko.md`) in the same change set:
- `docs/reference/project-requirements.md` <-> `docs/reference/project-requirements.ko.md`
- `docs/reference/service-user-flow.md` <-> `docs/reference/service-user-flow.ko.md`
- `docs/reference/design-guide.md` <-> `docs/reference/design-guide.ko.md`
- `docs/reference/agent-collaboration.md` <-> `docs/reference/agent-collaboration.ko.md`
- If requirements are ambiguous or guides conflict, escalate to Product Owner and the relevant domain owner before implementation.

## Context Efficiency Rules
- Start each task with a three-line brief: goal, in-scope/out-of-scope, and done checks.
- Load only role-minimal reference docs first; open additional docs when blocked or impact requires them.
- Follow search-first flow: `rg` locate -> entry file read -> target file deep read.
- Keep edits in small batches and verify after each batch to reduce context drift and merge risk.

## Multi-Agent Compatibility Policy
- Codex, Claude, and Gemini contributors follow the same source-priority and handoff format.
- Handoff metadata using `docs/templates/agent-handoff.md` is required for impact-trigger tasks and strongly recommended for medium-or-larger scoped tasks.
- Handoff may be skipped for minor single-domain changes when risk is low and context is clear in commit or PR text.
- Impact PRs must follow `.github/PULL_REQUEST_TEMPLATE.md`.
- If agent outputs conflict, resolve by source-priority docs, then PO intent, then relevant domain-owner technical decision.

## Domain Ownership And Merge Policy
- BE domain: `backend/**`
- FE domain: `frontend/**`
- Infra(lead) domain: `.github/workflows/**`, `docker-compose.yaml`, `k8s/**`, and deployment or ops manifests.
- Repository boundary: this repository is the application repository; k3s/ArgoCD GitOps manifests are managed in `https://github.com/Pseudo-Lab/DevFactory-Ops`.
- Direct push to `main` is allowed when one domain owner changes only their own domain and no impact trigger is hit.
- PR is required when any impact trigger is hit.

## Impact Trigger (PR Required)
- Changes span more than one domain (BE, FE, Infra).
- API contract, auth behavior, DB schema or migration changes affect other domains.
- Shared source-of-truth guides under `docs/*.md` are changed.
- CI/CD, deployment, security, ingress, secrets, or runtime topology changes are included.
- A change requires coordinated manifest updates in `Pseudo-Lab/DevFactory-Ops`.
- Product Owner or the relevant domain owner explicitly requests review by PR.

## Core Stack
- Backend: FastAPI
- Frontend: React + Vite + TypeScript + Tailwind CSS + `shadcn/ui`
- Data/Auth: Supabase
- Infra: k3s
- Deployment: ArgoCD

## Delivery Priority
1. Service page (user-facing flow)
2. Admin page and report features

## Agent Roster
1. `backend-api`: API, schema, auth, realtime, backend logic
2. `frontend`: Service-page-first React implementation and user-facing UX/UI decisions
3. `product-owner`: Scope decisions, milestone planning, cross-role coordination, and release quality direction
4. `qa`: Functional checks, regression, release quality gate

## Shared Rules
- Treat mobile and web compatibility as mandatory for service and admin pages.
- Follow P0 then P1 then P2 sequence from the planning reference.
- If `docs/reference/design-guide.md` exists, frontend must follow it as the UI implementation standard.
- Frontend should use Tailwind CSS with `shadcn/ui` as the default UI implementation baseline for new and refactored screens.
- When frontend UI is reworked substantially, prefer replacing legacy `MUI` and `emotion` UI layers with Tailwind CSS and `shadcn/ui`-based components unless a documented technical constraint blocks migration.
- When an existing frontend screen or component is touched and it diverges from the current baseline, align the touched scope to Tailwind CSS and `shadcn/ui` in the same task when feasible.
- Do not expand legacy `MUI` or `emotion` usage into new screens, new components, or newly edited areas; if temporary coexistence is unavoidable, isolate it and document the follow-up migration scope.
- Prefer `TanStack Query` for server-state synchronization, `Zustand` for local game and screen state, and `Motion` for meaningful UI feedback animations.
- Prefer `CSS Grid` plus `SVG` overlays for bingo board layout and completed-line rendering rather than canvas-heavy implementations.
- Document API contract deltas for frontend and QA handoff.
- Add or update tests for each behavior change.
- Track and verify regression around issue #81 behavior.

## Definition Of Done
- Responsive behavior is verified on mobile and desktop web viewports.
- Behavior matches acceptance criteria and planning priorities.
- Main and edge states are validated (success, error, empty, retry).
- Handoff notes are ready for the next role when handoff is required by impact or coordination needs.
- QA pass criteria are met for changed flows.
- UI changes include design-guide compliance notes when `docs/reference/design-guide.md` exists.

## Collaboration Handoff
- Product Owner defines scope, acceptance criteria, sequencing, and major risk mitigations.
- Backend and Frontend implement in parallel when possible.
- QA validates service-page scenarios first, then admin scenarios.





