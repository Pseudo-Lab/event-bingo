# Agent Collaboration Protocol (English Source)

## Goal
Enable consistent delivery when different contributors use Codex, Claude, or Gemini.

## Source Priority
1. `docs/project-requirements.md`
2. `docs/service-user-flow.md`
3. `docs/design-guide.md` (when exists)
4. This protocol: `docs/agent-collaboration.md`

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
- Product Owner or Team Leader requests review-by-PR.

## Work Contract Per Task
Each task must include these fields in handoff notes.
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
- Include handoff metadata in commit body or PR description:
- Agent: codex | claude | gemini
- Model: exact model name or version if available
- Date: YYYY-MM-DD

## PR Collaboration Checklist
- Source documents referenced
- Impact trigger checked and justified
- Korean mirror sync completed for changed English guides
- Test evidence attached
- Handoff note attached using template

## Conflict Resolution
- If outputs differ across agents, compare against source-priority order.
- Product Owner decides product intent conflicts.
- Team Leader decides technical conflict resolution.

## Language And Sync Rule
- English guides are source-of-truth for implementation.
- Korean mirrors must be updated in the same change set.
- Sync pair for this document:
- `docs/agent-collaboration.md` <-> `docs/agent-collaboration.ko.md`




