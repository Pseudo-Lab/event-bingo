# Agent Collaboration Protocol (English Source)

Status: active
Last-Validated: 2026-03-22

## Goal
Enable consistent delivery when different contributors use Codex, Claude, or Gemini.

## Source Priority
1. `docs/reference/project-requirements.md`
2. `docs/reference/service-user-flow.md`
3. `docs/reference/design-guide.md` (when exists)
4. This protocol: `docs/reference/agent-collaboration.md`

## Supported Agents
- Codex
- Claude
- Gemini

## Core Rules
- All agents must produce equivalent outcomes from the same source documents.
- Do not rely on provider-specific hidden memory.
- Record assumptions explicitly in handoff notes.
- Keep implementation deterministic and testable.

## Deployment Repository Boundary
- This repository is the application repository.
- k3s/ArgoCD GitOps manifests are managed in `https://github.com/Pseudo-Lab/DevFactory-Ops`.
- If deployment/runtime topology changes are needed, include coordinated handoff notes for the GitOps repository.

## Domain Ownership And Merge Policy
- BE domain owner handles `backend/**`.
- FE domain owner handles `frontend/**`.
- Infra(lead) domain owner handles `.github/workflows/**`, `docker-compose.yaml`, `k8s/**` in this repository, plus deployment/ops manifests in `Pseudo-Lab/DevFactory-Ops`.
- Domain owners can push directly to `main` without PR only for single-domain, non-impact changes.

## Impact Trigger (PR Required)
- Files from multiple domains are changed.
- API contract, auth behavior, DB schema, or migration changes affect another domain.
- Any source-of-truth guide in `docs/*.md` is changed.
- CI/CD, deployment, security, ingress, secrets, or runtime topology changes are included.
- A change requires coordinated updates in `Pseudo-Lab/DevFactory-Ops`.
- Product Owner or the relevant domain owner requests review-by-PR.

## Handoff Requirement Policy
Handoff notes are required for impact-trigger tasks and strongly recommended for medium-or-larger scoped tasks.
Handoff notes may be skipped for low-risk, minor, single-domain changes when context is clear in commit or PR text.

## Team Lead Mode
Team Lead Mode is optional and must be used only when the user explicitly asks for team-style or multi-agent work.
Do not enable Team Lead Mode automatically for small single-domain tasks.

The Team Lead agent owns coordination, not every implementation detail.
Team Lead responsibilities:
- Restate the task goal, in-scope work, out-of-scope work, and done checks.
- Read only the minimal source documents needed for the task.
- Inspect current worktree state before assigning work.
- Split work by role and file ownership.
- Identify which tasks can safely run in parallel and which must stay sequential.
- Assign sub-agents concrete bounded tasks with explicit ownership.
- Review sub-agent outputs before integration.
- Resolve conflicts by source-priority docs, Product Owner intent, and domain-owner technical judgment.
- Produce the final integrated summary, validation evidence, and follow-up list.

## Team Roles And Ownership
Available team roles are not mandatory participants.
The Team Lead should activate only the smallest role set needed for the task.

Core roles:
- `product-owner`: scope, acceptance criteria, sequencing, release risk, and trade-off decisions.
- `backend-api`: `backend/**`, API contracts, schemas, services, models, migrations, backend tests.
- `frontend`: `frontend/**`, UI flows, frontend API clients, state handling, responsive behavior, frontend tests.
- `qa`: test planning, read-only audit, defect reproduction, targeted regression, release-quality summary.

Conditional roles:
- `design`: design-guide compliance, UX review, visual consistency, accessibility and responsive layout review. Use when UI/UX quality, visual design, or responsive behavior is a primary concern.
- `security`: auth/authz review, privacy-sensitive data flow, secrets/config exposure, public/private API boundaries, exports, retention, and deployment-security risks. Use only when the task touches authentication, authorization, privacy-sensitive data, exports, secrets, runtime config, API access boundaries, or deployment security.
- `infra`: `.github/workflows/**`, `docker-compose*.yaml`, `k8s/**`, deployment/runtime topology notes.

Ownership rules:
- One file should have one active editing owner at a time.
- Large shared files such as `frontend/src/modules/Admin/AdminPortal.tsx` and `frontend/src/modules/Bingo/BingoGame.tsx` must not be edited concurrently by multiple roles.
- API contract changes must be coordinated between `backend-api`, `frontend`, and `qa`.
- Source-of-truth guide changes require the matching Korean mirror update in the same change set.

## Parallel Work Rules
Parallel work is allowed when tasks have disjoint write sets and clear contracts.
Good parallel candidates:
- Backend route/service changes and frontend design exploration when the API contract is already stable.
- QA read-only test audit while implementation agents are editing code.
- Security read-only review while implementation agents are editing auth, privacy, API, export, config, or deployment-security surfaces.
- Product acceptance criteria drafting while backend/frontend implementation continues.
- Documentation or handoff drafting that does not change source-of-truth requirements.

Sequential work is required when:
- One task depends on an unresolved API contract.
- Multiple roles need to edit the same file.
- A migration or schema change affects frontend request/response handling.
- QA must validate final behavior after implementation settles.
- The task touches privacy, security, deployment topology, or other impact-trigger surfaces.

## Sub-Agent Reporting Contract
Each sub-agent must report:
- Role and assigned scope.
- Files read.
- Files changed.
- Behavior changes.
- Validation run and result.
- Known risks or blockers.
- Follow-up needed.

Sub-agent reports are not final by themselves.
The Team Lead must review and integrate them into a single final answer or handoff note.

## QA/Test Timing
QA agents should start read-only unless the Team Lead assigns a narrow test-fix scope.
When other agents are actively modifying source code, QA should prefer:
- test inventory
- coverage and risk audit
- reproducible scenario design
- known failure documentation

QA may edit tests only when:
- implementation work for the relevant behavior is stable,
- file ownership is assigned,
- the expected behavior is clear,
- and the edit scope is narrow enough to avoid merge conflicts.

## Security Review Timing
Security agents should start read-only unless the Team Lead assigns a narrow security-fix scope.
Security-impacting fixes must be coordinated with affected roles when they touch authentication, authorization, privacy-sensitive data, exports, secrets, runtime configuration, public/private API boundaries, or deployment security.
When security and infra concerns overlap, split ownership this way:
- `infra` owns runtime wiring, deployment topology, CI/CD, containers, environment injection, and GitOps coordination.
- `security` owns risk review for exposure, access control, data protection, secret handling, and abuse or leakage paths.

## Light-Weight Completion Note
When a handoff note is skipped, leave a short completion note in commit or PR text.
- what changed
- how it was verified
- next impact or follow-up if any

## Work Contract For Required Handoffs
Required handoff notes must include these fields.
- Task ID
- Scope
- Inputs used
- Outputs created or changed
- Risks
- Next owner

Use template: `docs/templates/agent-handoff.md`

## Branch And Commit Convention
- Direct push path: commit directly on `main` for single-domain non-impact tasks.
- PR path branch: `feature/<task-id>-<short-slug>` or `fix/<task-id>-<short-slug>` or `codex/<task-id>-<short-slug>`.
- Commit title: `<type>(<scope>): <summary>`.
- Commit body metadata is optional; keep commit messages concise and focused on change intent.

## PR Collaboration Checklist
- Source documents referenced
- Impact trigger checked and justified
- Korean mirror sync completed for changed English guides
- Test evidence attached
- Handoff note attached using template

## Conflict Resolution
- If outputs differ across agents, compare against source-priority order.
- Product Owner decides product intent conflicts.
- Technical conflict resolution follows relevant domain ownership.

## Language And Sync Rule
- English guides are source-of-truth for implementation.
- Korean mirrors must be updated in the same change set.
- Sync pair for this document:
- `docs/reference/agent-collaboration.md` <-> `docs/reference/agent-collaboration.ko.md`






