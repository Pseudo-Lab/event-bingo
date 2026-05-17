# Agent Handoff

## Task Metadata
- Task ID: issue-202-demo-play-experience
- Date: 2026-05-17
- Area: Frontend

## Scope
- In scope:
- Add and refine `/demo/play` as an interactive PC demo flow for Bingo Networking.
- Keep `/demo/play` as a single flow: keyword selection -> bingo game screen.
- Match the PC design assets under `design/pc` for the selection screen and initial game screen geometry.
- Enforce exactly 3 selected keywords before starting the demo.
- Make the game screen vertically scrollable because the PC game design height is 1764px.
- Out of scope:
- Recording-specific page or video capture workflow. The user explicitly deferred recording.
- Backend, Supabase, auth, deployment, and infra changes.
- `tmp.md`, `1.png`, and `2.png` cleanup.

## Workspace
- Worktree path: `/home/ubuntu/.openclaw/workspace-df/event-bingo`
- Branch: `main`
- Base: `190de0e`

## Inputs Used
- Source docs:
- `AGENTS.md`
- `docs/reference/design-guide.md` was not opened during this handoff step; UI work followed user-provided design assets.
- Design assets:
- `design/pc/키워드 선택.svg`
- `design/pc/게임 - 개인전.svg`
- `design/pc/bingo.svg`
- `design/pc/info box.svg`
- `design/pc/Property 1=start off.svg`
- `design/pc/Property 1=start on.svg`
- `design/pc/관심사=keyword off.svg`
- `design/pc/관심사=keyword on.svg`
- Additional constraints:
- User wants the demo to show the actual service-style flow, not a static preview.
- User does not want the term "프리뷰" to create confusion; "데모" is the preferred concept.
- Recording is currently on hold.
- User expects the logo and common stage elements to stay visually aligned between selection and game screens.
- Do not touch `tmp.md`.

## Changes Made
- Files changed:
- `frontend/src/App.tsx`
- Added `/demo/play` route.
- `frontend/src/modules/Landing/DemoExperiencePage.tsx`
- Existing `/experience` work was already modified before this handoff; current focus shifted to `/demo/play`.
- `frontend/src/modules/Landing/DemoPlayPage.tsx`
- New interactive demo page.
- Selection screen uses a fixed 1920x1080 PC design stage and centered scaling.
- Game screen uses the same 1920x1080 scale basis for alignment, but renders inside a 1920x1764 scrollable stage.
- Keyword selection is capped at exactly 3 selections.
- Game screen renders top input card, info card, bingo board, exchange lists, and goal completion overlay.
- `frontend/src/modules/Landing/demoPlayUtils.ts`
- New demo scenario/data utility module.
- Defines keyword list, default selection, selection min/max, board generation, exchange steps, and step application.
- `frontend/src/modules/Landing/demoPlayUtils.test.ts`
- Unit tests for board generation and exchange-step behavior.
- Behavior changes:
- `/demo/play` starts at keyword selection.
- Start button is enabled only when exactly 3 keywords are selected.
- Clicking start moves to the bingo game demo.
- Clicking send advances the scripted exchange flow until goal completion.
- Game screen can scroll vertically to expose the lower list area.

## Validation
- Tests run:
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Browser smoke with Playwright against local Vite dev server:
- Opened `/demo/play`.
- Clicked `빙고 시작하기`.
- Advanced send flow to `목표 달성!`.
- Checked scroll container metrics after game start.
- Results:
- Build passed.
- `demoPlayUtils.test.ts`: 3 tests passed.
- Game screen scroll container was confirmed scrollable after correction.
- Latest scale correction was followed by build and unit test pass.
- Not run and reason:
- Full e2e suite was not run; change is isolated to demo page and current smoke covered the changed flow.
- Visual regression tooling was not run; no automated visual regression setup was used.

## Risks
- Known risks:
- `frontend/src/modules/Landing/DemoPlayPage.tsx` is currently untracked, so it must be added explicitly before commit.
- `demoPlayUtils.ts` and its test are also untracked.
- The game screen is still an approximation of the full SVG design, not a pixel-perfect SVG extraction.
- The exchange list cards are functional but may need design refinement against `게임 - 개인전.svg`.
- Board line overlay is approximate and should be checked visually after each scenario step.
- The current common scale logic preserves logo/stage alignment between selection and game screens, but the game screen's scroll height depends on the scrollable stage wrapper.
- Follow-up needed:
- Confirm visually on `https://bingo-private.pseudolab-devfactory.com/demo/play` after dev server HMR updates.
- Decide whether to add `scene` query support later for direct QA entry into selection/game states.
- If recording resumes, consider adding `?scene=game&step=...` rather than splitting routes.
- Remove or intentionally keep local screenshots `1.png` and `2.png`; they were not touched here.

## Next Owner
- Owner: Frontend
- Expected next action:
- Review `/demo/play` visually in browser after the latest scale correction.
- Continue refining game screen card/board/list spacing against `design/pc/게임 - 개인전.svg`.
- Keep `/demo/play` as a single flow unless recording/QA requirements require scene query support.

## Continuation Update - 2026-05-17 22:00 KST
- Follow-up owner: Frontend
- Additional changes:
- Added `data-demo-play-scroll` to the scroll wrapper so Playwright smoke can verify scroll metrics directly.
- Removed an unused `index` variable that caused `npm run lint` to fail.
- Refined the PC game screen toward `design/pc/게임 - 개인전.svg`:
- Added the character illustration inside the top input card.
- Tightened the progress/info card vertical spacing so counters no longer clip.
- Reworked the lower exchange lists from heavy cards into compact rows closer to the SVG design.
- Changed lower list counts to reflect completed given/received exchange steps separately.
- Added the footer copyright line from the PC design.
- Added compact `+N` keyword summarization for long exchange rows to avoid clipping.
- Restored keyword selection button styling to match `design/pc/관심사=keyword on.svg` and `design/pc/관심사=keyword off.svg` by removing the extra selected-state shadow.
- Additional validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- Opened `/demo/play`.
- Clicked `빙고 시작하기`.
- Advanced send flow through goal completion.
- Confirmed `목표 달성!`, no horizontal offscreen elements, and vertical scroll metrics: `clientHeight=900`, `scrollHeight=1323`, `canScrollY=true`.
- Remaining risks:
- The board completion overlay and line style are still approximate rather than pixel-perfect against the SVG.
- The demo scenario uses 2 host-send and 3 guest-send rows, so lower-list counts differ from the static SVG sample count of 9.

## Product Direction Update - 2026-05-17 22:24 KST
- Recording remains deferred.
- Treat `/demo/play` as an interactive product demo for users to understand what the bingo game is.
- Do not steer the current work toward a tutorial-style UI with heavy step instructions or recording/video-capture affordances.
- Keep the core demo flow focused: interest selection -> game start -> keyword send -> board change -> goal completion.
- Follow-up cleanup completed:
- Landing hero CTA now links directly to `/demo/play`.
- `/experience` now redirects to `/demo/play` instead of showing recording-placeholder content.
- `/bingo` continues to use `DemoExperiencePage`, so it also resolves to `/demo/play`.

## Continuation Update - 2026-05-17 22:40 KST
- Kept the work in single-agent mode.
- Adjusted the game action control for interactive-demo clarity:
- Host-send steps show `김민지` and `보내기`.
- Guest-reply steps show `김민지 답장` and `받기`.
- Completed state shows `키워드 입력` and disabled `완료`.
- Changed the info-card secondary counter from `만난 참가자` to `교환 진행` with `completed/total` progress because this demo uses one counterpart with multiple scripted exchanges.
- Additional validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke confirmed send/receive/done labels, `목표 달성!`, and no horizontal overflow/offscreen elements.

## Final Handoff Snapshot - 2026-05-17 22:50 KST
- Current workspace: `/home/ubuntu/.openclaw/workspace-df/event-bingo`
- Runtime target: `https://bingo-private.pseudolab-devfactory.com` -> Caddy -> `127.0.0.1:3000` -> this workspace's Vite dev server.
- Active direction:
- Keep `/demo/play` as a user-facing interactive demo to understand the bingo game.
- Do not add recording placeholder UI, tutorial overlays, or video-capture workflow unless Product explicitly reopens that scope.
- Current changed files:
- `frontend/src/App.tsx`: adds `/demo/play` route.
- `frontend/src/modules/Landing/DemoExperiencePage.tsx`: now redirects to `/demo/play`.
- `frontend/src/modules/Landing/components/HeroSection.tsx`: landing CTA points to `/demo/play`.
- `frontend/src/modules/Landing/DemoPlayPage.tsx`: new PC-scaled interactive demo page.
- `frontend/src/modules/Landing/demoPlayUtils.ts`: scenario/data helpers.
- `frontend/src/modules/Landing/demoPlayUtils.test.ts`: scenario tests.
- `docs/handoffs/2026-05-17-demo-play-page-handoff.md`: this handoff.
- Important git note:
- The new files are still untracked. Add them explicitly before commit.
- Current known git status:
- Modified: `frontend/src/App.tsx`, `frontend/src/modules/Landing/DemoExperiencePage.tsx`, `frontend/src/modules/Landing/components/HeroSection.tsx`
- Untracked: `docs/handoffs/2026-05-17-demo-play-page-handoff.md`, `frontend/src/modules/Landing/DemoPlayPage.tsx`, `frontend/src/modules/Landing/demoPlayUtils.ts`, `frontend/src/modules/Landing/demoPlayUtils.test.ts`
- Most recent validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright route smoke:
- `/` landing CTA href is `/demo/play`.
- `/experience` redirects to `/demo/play`.
- `/bingo` redirects to `/demo/play`.
- `/demo/play` shows interest selection.
- Clicking `빙고 시작하기` enters the game screen.
- Playwright interaction smoke:
- Action button cycles through `보내기` -> `받기` -> `보내기` -> `받기` -> `받기` -> disabled `완료`.
- Goal completion text `목표 달성!` appears.
- No horizontal overflow/offscreen elements were detected in the checked viewport.
- Suggested next steps for the next agent:
- Visually inspect `/demo/play` on `bingo-private` after HMR catches up.
- Compare game board line overlay and goal overlay against `design/pc/게임 - 개인전.svg`.
- Decide whether the static SVG sample's list count `9` should be reflected in demo copy, or keep current scripted exchange counts `2/3`.
- If preparing a commit, include all untracked files and mention the verification commands in the commit/PR note.
- Do not touch `tmp.md`, `1.png`, or `2.png` unless explicitly asked.

## Continuation Update - 2026-05-17 23:00 KST
- Continued in the same workspace.
- Additional changes:
- Added subtle board connection lines behind the 5x5 cells using `createBoardConnectionLines(5)` to better match `design/pc/bingo.svg`.
- Adjusted completed-line overlay dimensions from `565x573` to `560x560` so line endpoints align more closely with the actual cell-center grid.
- Changed completed-line colors to a lighter DevFactory bingo tone: `#ddff57` base stroke with `#076945` inner stroke.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`

## Continuation Update - 2026-05-17 23:34 KST
- User noted the lower history row number badges (`1,2,3,4`) did not match the SVG.
- Checked `for me.svg` and `to me.svg`:
- Number badge background is `#DDFF57`.
- Number glyph fill is `#00905B`.
- Additional changes:
- Removed the previous state-dependent dark-green pending number badge.
- All history number badges now consistently use `#DDFF57` background and `#00905B` text, matching the design asset.
- Latest validation:
- `npm run lint`
- `npm run test -- demoPlayUtils.test.ts`

## Continuation Update - 2026-05-17 23:43 KST
- User asked to try a PC layout with the bingo board on the right and the rest of the information on the left.
- Additional changes:
- Changed the `/demo/play` game screen from scrollable game canvas to a fixed 1920x1080 PC canvas.
- Left column now contains the input card, info/status card, and both exchange history cards.
- Right column now contains the bingo board.
- Kept all content visible in one viewport without vertical scroll.
- Adjusted the info card internals to fixed SVG-like coordinates so progress text and counts stay inside the `236x290` source card area.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- Entered `/demo/play`, clicked `빙고 시작하기`, completed the full scripted interaction through `목표 달성!`.
- Confirmed no horizontal overflow and no vertical overflow.

## Continuation Update - 2026-05-17 23:46 KST
- User provided a target screenshot showing left information cards and the bingo board on the right.
- Additional layout adjustment:
- Moved the whole game composition far left to reduce the excessive left margin.
- Left column now starts near the viewport edge after scaling.

## Continuation Update - 2026-05-18 01:40 KST
- Continued in the same workspace after the demo game route had already been split to `/demo/play/game`.
- Additional changes:
- Refined exchange-history item separators so each participant row owns its own vertical padding and bottom border. This prevents divider lines from floating too low when rows are added dynamically.
- Moved the demo send/receive feedback toast to a demo-only top-center position below the header. This keeps the feedback prominent without blocking the bingo board like a modal.
- Added `docs/reports/2026-05-18-demo-event-logging-plan.md` as a research-backed tracking plan for future demo analytics and experiment logging.
- Research references used:
- Material Design snackbars/toasts, Atlassian Flag, OpenTelemetry event semantics, Snowplow events, GA4 recommended events, and 개인정보보호위원회 가명정보 guidance.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- Opened `/demo/play`, selected three keywords, entered `/demo/play/game`, clicked `보내기`, confirmed the toast appears top-center, then advanced receive steps and confirmed list rows render as stacked participant sections with per-row separators.
- Right bingo board starts near the right half/top of the viewport instead of being vertically aligned lower.
- Widened the left history cards so the two cards visually match the screenshot balance better.
- Latest measured Playwright layout at 1440x900:
- Input card: `x=34`, `y=65`, `w=315`, `h=218`
- Bingo board: `x=675`, `y=51`, `w=506`, `h=512`
- Given history list: `x=58`, `y=371`, `w=222`, `h=221`
- Received history list: `x=346`, `y=369`, `w=222`, `h=222`
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke completed the scripted flow through `목표 달성!`.
- Confirmed no horizontal or vertical overflow.
- Playwright smoke at 1440x900:
- Completed the full `/demo/play` flow through `목표 달성!`.
- Confirmed vertical scroll metrics remain valid: `scrollHeight=1323`, `clientHeight=900`.
- Confirmed no horizontal overflow.
- Remaining visual review:
- Goal-complete overlay is intentionally functional and still not pixel-perfect to the source SVG; if design fidelity becomes stricter, refine the overlay treatment next.

## Continuation Update - 2026-05-17 23:05 KST
- Direction changed after review:
- The demo board should not approximate the real board with separate Tailwind markup.
- It now reuses the actual service board component, `BingoBoardSection`, from `frontend/src/modules/Bingo/BingoView.tsx`.
- Additional changes:
- Imported `BingoBoardSection` and `frontend/src/modules/Bingo/BingoGame.css` in `DemoPlayPage.tsx`.
- Removed the custom 5x5 board cell/line markup from the demo board wrapper.
- Passed demo board state, `connectionLines`, `completedLines`, latest cells, animated cells, and completed cell indexes into the real board component.
- Kept the demo-only goal overlay outside the reused board component.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- Completed the full `/demo/play` flow through `목표 달성!`.
- Confirmed no horizontal overflow.
- Confirmed scroll metrics remain valid: `scrollHeight=1323`, `clientHeight=900`.
- Visual note:
- The board now follows the real bingo board visual system, including placeholder/received/complete cell states and star assets.
- Remaining difference is the demo-only overlay and the fixed PC-stage placement around the board.

## Continuation Update - 2026-05-17 23:08 KST
- Fixed lower exchange history scrolling.
- Changed both history cards to flex column containers and made only the list area scrollable with `overflow-y-auto`.
- Added `data-demo-history-list="given"` and `data-demo-history-list="received"` for smoke checks.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke after completing `/demo/play`:
- `received` history list: `scrollHeight=350`, `clientHeight=296`, `canScroll=true`.
- `given` history list: `scrollHeight=294`, `clientHeight=294`, `canScroll=false` because the scripted flow currently has only 2 host-send rows and does not overflow.

## Continuation Update - 2026-05-17 23:13 KST
- User provided additional lower-history design assets:
- `design/pc/to me.svg`
- `design/pc/for me.svg`
- Compared the SVGs against the implementation.
- The key layout is a 330x412 dark green card, header near `x=33 y=35`, list content starting around `y=80`, compact rows with number badge + name + keyword chips, and a right-side scrollbar on overflowing content.
- Additional changes:
- Simplified `ExchangeCard` to match the SVG row structure.
- Removed demo-only row title/status badge from history rows.
- Rows now show only index badge, participant name, and keyword chips.
- Keyword chips now use the SVG tone: `#00905B` background and `#28D791` text.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke after completing `/demo/play`:
- `received` history list remains scrollable: `scrollHeight=312`, `clientHeight=296`, `canScroll=true`.
- `given` history list still does not overflow with the current 2-row scripted flow.

## Continuation Update - 2026-05-17 23:27 KST
- User provided additional design assets:
- `design/pc/Mask group.svg`
- `design/pc/input keyword.svg`
- `design/pc/Property 1=off.svg`
- `design/pc/Property 1=on.svg`
- `design/pc/Property 1=success.svg`
- Checked `Mask group.svg` against `frontend/src/assets/illustrations/character.svg`.
- The only detected byte differences are SVG mask IDs (`mask0_382_1299` vs `mask0_382_1298`); visible path data appears equivalent, so no asset replacement was needed.
- Additional changes:
- Aligned the top input card to `input keyword.svg`: input box now sits at `x=30 y=200`, send button at the same 60px-high input area, and the character illustration uses `x=244 y=87 w=176`.
- Added demo-scoped board overrides in `BingoGame.css` under `.demo-play-board` only.
- Demo board outer size now follows `bingo.svg` (`675x683`, 40px radius), inner board uses `607x615`, and grid/cell spacing is closer to the PC design.
- Demo board cell states now better follow the button SVGs: off `#AAEBB7`, on/success `#4FC399` with `#118F4E` stroke, 10px cell radius, 20px labels.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- Entered `/demo/play`, clicked `빙고 시작하기`, completed the full scripted interaction through `목표 달성!`.
- Confirmed no horizontal overflow.
- Measured scaled game layout: input card `420x290` and board `675x683` at source coordinates, scaled to viewport as expected.

## Continuation Update - 2026-05-17 23:32 KST
- User noted `design/pc/for me.svg` color mismatch, especially scrollbar color.
- Checked SVG colors:
- Card background `#076945`
- Keyword chips `#00905B`
- Chip text `#28D791`
- Count highlight `#FF5757`
- Scrollbar thumb `#4FC39B` with `opacity="0.4"`, width `4`, radius `2`
- Additional changes:
- Replaced the previous yellow history scrollbar (`#ddff57`) with a demo-only `.demo-play-history-list` scrollbar style.
- Scrollbar now uses `rgba(79, 195, 155, 0.4)` and 4px WebKit width, matching the SVG closer.
- Applied the same scrollbar treatment to both lower history cards for visual consistency.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`

## Continuation Update - 2026-05-18 00:38 KST
- Updated the previously documented single-flow direction.
- `/demo/play` is now intended to be the keyword selection route.
- `/demo/play/game?keywords=...` is now intended to be the bingo demo game route.
- Browser back from the game route should return to `/demo/play`, matching normal browser expectations.
- Selected keywords are passed through the `keywords` query parameter.
- Direct game-route access without at least 3 keywords redirects back to `/demo/play`.
- Reworked the `데모 이벤트` marker from a large centered floating badge into a small supporting chip next to the Bingo Networking logo.
- Reasoning: badge/tag design-system guidance treats these as compact status/category labels near the related object, not as a central page title.
- Pending validation after this update:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Browser smoke for `/demo/play -> /demo/play/game -> back`.

## Continuation Update - 2026-05-18 00:44 KST
- Completed the route split implementation:
- `/demo/play` renders the keyword selection screen.
- Starting the demo navigates to `/demo/play/game?keywords=...`.
- `/demo/play/game` renders the bingo demo screen from query keywords.
- Browser back from `/demo/play/game?...` returns to `/demo/play`.
- Direct `/demo/play/game` access without 3 keywords redirects to `/demo/play`.
- Moved the `데모 이벤트` marker into a compact logo-adjacent chip.
- Center-aligned the game content group with `left-1/2 -translate-x-1/2` and added `data-demo-game-layout` for smoke checks.
- Increased the `키워드는 3개 선택해야 합니다.` validation copy from 14px to 18px and enlarged the selection card height so it does not crowd the card edge.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- Start button disabled before 3 keywords and enabled after 3 keywords.
- `/demo/play -> /demo/play/game?keywords=... -> browser back -> /demo/play` works.
- Sent/received keyword toast variants are visible.
- Game layout center delta is `0`.

## Continuation Update - 2026-05-18 00:52 KST
- Refined `/demo/play/game` visual balance:
- Shifted the game content group down from source `top=110` to `top=132`.
- Kept the game content group horizontally centered with center delta `0`.
- Increased the left information card column from `744px` to `806px`.
- Increased top info cards from `360x290` to `390x306`.
- Increased lower history cards from `360x412` to `390x430`.
- Increased key text sizes in the left info/status/history cards for better readability without changing the fixed 1920x1080 stage scaling policy.
- Refined demo exchange scenario:
- Flow is now 1 host send followed by 4 received-keyword steps.
- Participant names are now varied across the demo: 서도윤, 정아린, 이하준, 최유나.
- Updated tests to match the new scenario timing.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- Game layout center delta is `0`.
- First action is `보내기`.
- Subsequent actions use `키워드 받기`.
- Multiple participant names appear in the received flow.

## Continuation Update - 2026-05-18 01:08 KST
- Implemented randomized board variants for `/demo/play/game`.
- The game URL no longer appends or exposes `board=...`.
- The game page picks a fresh board variant on component load, so reload also changes the board.
- Added 5 board variants using rotations/mirroring of the base completion pattern.
- The board keyword placement now changes with the variant, not just the completion indexes.
- All variants preserve the same demo scenario:
- 1 host send with 4 keywords.
- 1st received exchange has 4 keywords and no bingo.
- 2nd received exchange has 4 keywords and completes exactly 1 line.
- 3rd received exchange has 4 keywords and reaches the 3-line goal.
- Updated status card copy from `교환 진행 n/n` to `만난 참가자 n명`.
- Latest validation:
- `npm run lint`
- `npm run build`
- `npm run test -- demoPlayUtils.test.ts`
- Playwright smoke at 1440x900:
- `/demo/play` starts `/demo/play/game?keywords=...` with no `board` query.
- Reload changes the visible board keyword placement in the sample run.
- `만난 참가자` starts at `0명` and becomes `1명` after the host send.
- First receive records received keywords.
- Second receive shows `33%`.
- Third receive shows `목표 달성!`.
