# Agent Handoff Template

## Task Metadata
- Task ID: agent-worktree-isolation

## Scope
- In scope: Add default `git worktree` isolation guidance for multi-agent and multi-window work.
- Out of scope: Create or remove task worktrees; change application code.

## Workspace
- Worktree path: `/home/ubuntu/.openclaw/workspace-bingo`
- Branch: `main`
- Base: `origin/main` guidance, current local `main` worktree

## Inputs Used
- Source docs: `AGENTS.md`, `docs/reference/agent-collaboration.md`, `docs/templates/agent-handoff.md`
- Additional constraints: Git official `git-worktree` documentation; Korean mirror sync rule

## Changes Made
- Files changed: `AGENTS.md`, `docs/reference/agent-collaboration.md`, `docs/reference/agent-collaboration.ko.md`, `docs/templates/agent-handoff.md`, `docs/templates/agent-handoff.ko.md`, this handoff note
- Behavior changes: Future task sessions should use one task worktree and one branch per task, agent window, or role before editing files. This is separate from Team Lead Mode or multi-agent delegation.

## Validation
- Tests run: Documentation review and `git diff --check`
- Results: Passed
- Not run and reason: Application tests were not run because this is documentation-only.

## Risks
- Known risks: `git worktree` lowers local file contention but same-file merge conflicts can still occur.
- Follow-up needed: Team members should clean up stale local worktrees after merged branches are no longer needed.

## Next Owner
- Owner: Product Owner / Team Lead
- Expected next action: Apply the worktree policy when opening new agent sessions or delegating parallel work.
