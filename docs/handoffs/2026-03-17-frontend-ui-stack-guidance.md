# Agent Handoff

## Task Metadata
- Task ID: 20260317-frontend-ui-stack-guidance
- Agent: codex
- Model: GPT-5
- Date: 2026-03-17

## Scope
- In scope:
  - Update frontend guidance documents to standardize the UI stack on Tailwind CSS and `shadcn/ui`.
  - Add migration guidance so touched legacy `MUI` and `emotion` UI moves toward the new baseline.
- Out of scope:
  - Package installation or code migration in `frontend/**`.
  - Backend, infra, or runtime changes.

## Inputs Used
- Source docs:
  - `AGENTS.md`
  - `docs/project-requirements.md`
  - `docs/design-guide.md`
  - `docs/agent-collaboration.md`
- Additional constraints:
  - Keep Korean mirrors in sync with changed English guides.
  - Treat `docs/*.md` changes as PR-required impact changes.

## Changes Made
- Files changed:
  - `AGENTS.md`
  - `docs/project-requirements.md`
  - `docs/project-requirements.ko.md`
  - `docs/design-guide.md`
  - `docs/design-guide.ko.md`
  - `docs/handoffs/2026-03-17-frontend-ui-stack-guidance.md`
- Behavior changes:
  - Frontend baseline now prefers `React + Vite + TypeScript + Tailwind CSS + shadcn/ui`.
  - State and motion guidance now prefers `TanStack Query`, `Zustand`, `Motion`, and `CSS Grid + SVG` for bingo boards.
  - Touched legacy `MUI` and `emotion` UI is expected to migrate toward the new baseline when feasible.

## Validation
- Tests run:
  - None
- Results:
  - Documentation updates reviewed with `git diff`.
- Not run and reason:
  - No code behavior changed; this task only updates project guidance documents.

## Risks
- Known risks:
  - The repository docs now set a migration direction, but the actual frontend codebase still uses legacy UI dependencies until implementation work follows.
- Follow-up needed:
  - Add the new frontend dependencies and migrate existing `MUI` and `emotion` UI in `frontend/**`.

## Next Owner
- Owner: frontend
- Expected next action:
  - Apply the documented stack direction in the next UI implementation or migration task.
