# Docs Overview

## Purpose
- Make it easy to open only the docs needed for the current task.
- Keep source-of-truth docs and output docs clearly separated.

## 30-Second Start Checklist
1. Write the task goal in one sentence.
2. List `in-scope` and `out-of-scope` quickly.
3. Define 2-3 done checks before implementation.
4. Open only the minimal read path for your role first.

## Structure
```text
docs/
  README.md
  reference/
  templates/
  reports/
    handoffs/
```

## Folder Meaning
- `reference/`: active source-of-truth docs for product, flow, design, and collaboration.
- `templates/`: reusable document templates.
- `reports/`: time-bound outputs such as QA reports, release readiness notes, and investigation summaries.
- `reports/handoffs/`: accepted handoff notes and delivery handoff outputs.

## Minimal Read Paths By Role
- `backend-api`
  - `docs/reference/project-requirements.md`
  - `docs/reference/service-user-flow.md`
  - `docs/reference/agent-collaboration.md`
  - Optional: `docs/reference/design-guide.md` when API behavior affects UI
- `frontend`
  - `docs/reference/project-requirements.md`
  - `docs/reference/service-user-flow.md`
  - `docs/reference/design-guide.md`
  - `docs/reference/agent-collaboration.md`
- `qa`
  - `docs/reference/project-requirements.md`
  - `docs/reference/service-user-flow.md`
  - `docs/reference/design-guide.md`
  - `docs/reference/agent-collaboration.md`
- `product-owner`
  - `docs/reference/project-requirements.md`
  - `docs/reference/service-user-flow.md`
  - `docs/reference/agent-collaboration.md`
  - Optional: `docs/reference/design-guide.md`

## Current Source-Of-Truth Files
- `docs/reference/project-requirements.md`
- `docs/reference/project-requirements.ko.md`
- `docs/reference/service-user-flow.md`
- `docs/reference/service-user-flow.ko.md`
- `docs/reference/design-guide.md`
- `docs/reference/design-guide.ko.md`
- `docs/reference/agent-collaboration.md`
- `docs/reference/agent-collaboration.ko.md`

## Templates
- `docs/templates/agent-handoff.md`
- `docs/templates/agent-handoff.ko.md`

## Reports Rules
- Put new result documents under `docs/reports/`.
- Put handoff output files under `docs/reports/handoffs/` when handoff is required.
- Use date-first names when possible, for example `2026-03-17-release-readiness.md`.
- Keep reports immutable after sign-off; create a new report for follow-up updates.

## Context Efficiency Rules
- Search first with `rg` before opening full files.
- Read entry points before opening large modules.
- Avoid reopening the same file without a concrete question.
- Make changes in small batches and validate after each batch.

## Language Sync Rule
- English reference docs are implementation source-of-truth.
- If an English reference doc changes, update its Korean mirror in the same change set.
