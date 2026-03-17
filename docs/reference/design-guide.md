# Design Guide (English Source)

## Purpose
Provide a consistent UI standard for service pages and admin pages.

## Language Rule
- This English file is the implementation source-of-truth.
- Update `docs/reference/design-guide.ko.md` whenever this file changes.

## UI Implementation Base
- Keep `React + Vite + TypeScript` as the frontend application shell.
- Use Tailwind CSS with `shadcn/ui` as the default component baseline for new and refactored frontend work.
- Reuse and adapt `shadcn/ui` blocks and interaction patterns before introducing custom primitives.
- Prefer `TanStack Query` for server-state synchronization and `Zustand` for local game and screen state.
- Use `Motion` for meaningful reveal, progress, and completion feedback where animation improves comprehension.
- Prefer `CSS Grid` plus `SVG` overlays for bingo board layout and completed-line rendering.
- When a screen is substantially reworked, prefer replacing legacy `MUI` and `emotion` UI layers with Tailwind CSS and `shadcn/ui`-based components unless a documented technical constraint blocks migration.
- When an existing screen or component is modified, migrate the touched UI scope toward Tailwind CSS and `shadcn/ui` unless a documented technical constraint blocks migration.
- Do not extend legacy `MUI` or `emotion` usage into new surfaces while migration is in progress.
- Keep visual tokens and component behavior consistent across migrated and non-migrated screens during transition.

## Design Principles
- Mobile-first layout with desktop compatibility.
- Keep primary actions clear: login, start bingo, send keyword.
- Preserve playful bingo identity with clear readability.

## Brand Direction
- Primary palette: mint and green tones from approved mockups.
- Accent palette: red and blue for team-versus context only.
- Keep contrast high for text and actionable controls.

## Typography
- Use one headline style and one body style consistently.
- Headline text should remain bold and high contrast.
- Body text should maintain legibility at small mobile sizes.

## Spacing And Radius
- Use consistent spacing scale across all cards and sections.
- Keep rounded corner style consistent for cards and buttons.
- Avoid mixing many radius values in one screen.

## Component Rules
- Login card: name, password, privacy consent, primary submit.
- Keyword selection: selectable chips with clear selected state.
- Game action: keyword input plus send button in one row.
- Progress card: completion percentage, counters, progress bar.
- Bingo board: fixed grid layout with stable cell size.
- Team panel: versus context, goal progress, remaining lines.
- Interaction lists: given-to and received-from columns with clear labels.

## Responsive Rules
- Required viewports:
- mobile web: 375x812 baseline
- desktop web: 1280px+ baseline
- Prevent layout overlap, clipping, and horizontal scrolling.

## Accessibility
- Keep text-to-background contrast readable.
- Ensure touch target sizes are mobile friendly.
- Provide focus-visible style for keyboard navigation on web.

## QA Handoff
- Include design compliance notes in PR when UI changes are made.
- Flag any intentional deviations from this guide.

