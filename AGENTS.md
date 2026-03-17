# Event Bingo Project Agents

## Product Goals
- Help organizers create events quickly.
- Support configurable bingo settings for each event.
- Provide event-level analytics and report outcomes.
- Run DB and login through Supabase.

## Source Of Truth
- Primary planning reference: `docs/project-requirements.md`
- Primary service-flow reference: `docs/service-user-flow.md`
- UI design guide: `docs/design-guide.md`
- Agent collaboration protocol: `docs/agent-collaboration.md`
- English guides (`*.md`) are implementation source-of-truth.
- When an English guide changes, update its Korean mirror (`*.ko.md`) in the same change set:
- `docs/project-requirements.md` <-> `docs/project-requirements.ko.md`
- `docs/service-user-flow.md` <-> `docs/service-user-flow.ko.md`
- `docs/design-guide.md` <-> `docs/design-guide.ko.md`
- `docs/agent-collaboration.md` <-> `docs/agent-collaboration.ko.md`
- If requirements are ambiguous or guides conflict, escalate to Product Owner and Team Leader before implementation.

## Multi-Agent Compatibility Policy
- Codex, Claude, and Gemini contributors follow the same source-priority and handoff format.
- Every task must include handoff metadata using `docs/templates/agent-handoff.md`.
- Impact PRs must follow `.github/PULL_REQUEST_TEMPLATE.md`.
- If agent outputs conflict, resolve by source-priority docs, then PO intent, then team-leader technical decision.

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
- Product Owner or Team Leader explicitly requests review by PR.

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
2. `frontend`: Service-page-first React implementation
3. `design-fe`: Design + implementation for user-facing UX
4. `product-planner`: Milestones, backlog slicing, dependency planning
5. `product-owner`: Scope decisions and acceptance quality
6. `team-leader`: Cross-role technical direction and risk control
7. `qa`: Functional checks, regression, release quality gate

## Shared Rules
- Treat mobile and web compatibility as mandatory for service and admin pages.
- Follow P0 then P1 then P2 sequence from the planning reference.
- If `docs/design-guide.md` exists, frontend and design-fe must follow it as UI implementation standard.
- Frontend and design-fe should use Tailwind CSS with `shadcn/ui` as the default UI implementation baseline for new and refactored screens.
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
- Handoff notes are ready for the next role.
- QA pass criteria are met for changed flows.
- UI changes include design-guide compliance notes when `docs/design-guide.md` exists.

## Collaboration Handoff
- Product Planner and Product Owner define scope and acceptance criteria.
- Team Leader confirms architecture, sequencing, and risk mitigations.
- Backend and Frontend or Design-FE implement in parallel when possible.
- QA validates service-page scenarios first, then admin scenarios.
