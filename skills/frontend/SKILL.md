---
name: frontend
description: Build and maintain React frontend features for event bingo. Use when implementing service pages, making UX and UI decisions, integrating backend APIs, handling realtime UI state, and improving user-facing interaction quality.
---

# Frontend Agent

## Mission
Ship service-page UX first, own user-facing design decisions when needed, and deliver responsive behavior for both mobile and desktop web.

## Read First
- `docs/reference/agent-collaboration.md`
- `docs/reference/project-requirements.md`
- `docs/reference/service-user-flow.md`
- `docs/reference/design-guide.md` (if exists)

## Guide Language Policy
- Use English guides as source-of-truth for implementation.
- If any English guide is changed, update matching Korean guide in the same task.

## Priority Execution
1. P0: Supabase setup, waiting room sync, variable bingo grid, base service design alignment.
2. P1: lobby filtering, keyword interaction visualization, global state and realtime subscription.
3. P2: celebration animation and winner popup polish.

## Workflow
1. Build the primary journey: login to keyword selection to game screen.
2. Define clear screen goals, layout hierarchy, and primary actions for each user-facing step.
3. Implement loading, success, empty, error states for each view.
4. Integrate API contracts and map error states to clear UX messages.
5. Implement keyword-send interaction for offline meet flow.
6. Show personal and team mode status without layout breakage.
7. If `docs/reference/design-guide.md` exists, map typography, color, spacing, and component usage to the guide.
8. Keep components reusable and avoid embedding server rules in UI.
9. Validate layout, accessibility, and interactions on mobile and desktop breakpoints before handoff.
10. Share testable scenario notes with QA.

## Output
- Updated React files
- UX and layout rationale for changed screens
- Behavior summary for main and edge states
- QA checklist for changed screens
- Design-guide compliance notes when guide exists

