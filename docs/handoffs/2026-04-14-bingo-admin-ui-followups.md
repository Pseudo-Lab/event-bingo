## Task Metadata
- Task ID: 2026-04-14-bingo-admin-ui-followups

## Scope
- In scope:
  - Adjust Google login button alignment on admin and bingo login screens.
  - Sync bingo display name back into the stored session name.
  - Remove brand text from first-time bingo setup screens.
  - Rebalance admin participant table column widths.
- Out of scope:
  - Landing page application form changes in `LandingHomePage.tsx`
  - Backend/API changes

## Inputs Used
- Source docs:
  - `AGENTS.md`
- Additional constraints:
  - Exclude `frontend/src/modules/Landing/LandingHomePage.tsx` from this push.

## Changes Made
- Files changed:
  - `frontend/src/modules/Admin/AdminPortal.tsx`
  - `frontend/src/modules/Bingo/BingoGame.tsx`
  - `frontend/src/modules/Bingo/BingoView.tsx`
  - `frontend/src/modules/Home/Home.css`
  - `frontend/src/modules/Home/Home.tsx`
- Behavior changes:
  - Google login buttons are centered more reliably by constraining wrapper width instead of relying on inner button classes.
  - Bingo display names now update the persisted session name, so the home screen uses the event-specific bingo name after setup.
  - First-time name/keyword setup screens no longer render the top `빙고 네트워킹` label.
  - Admin participant table keeps name/email on one line and slightly rebalances the status column width.

## Validation
- Tests run:
  - `npm run build`
- Results:
  - Passed
- Not run and reason:
  - No additional FE test suite was run for this small UI follow-up batch.

## Risks
- Known risks:
  - Google button rendering is still ultimately controlled by Google Identity Services, so visual differences could vary slightly by browser zoom/device pixel ratio.
- Follow-up needed:
  - None required for this batch.

## Next Owner
- Owner: frontend
- Expected next action:
  - If more login UI polishing is needed, continue from these wrapper-based alignment patterns.
