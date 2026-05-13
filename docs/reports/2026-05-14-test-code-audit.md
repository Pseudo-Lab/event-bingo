# Test Code Audit

## Task Metadata
- Task ID: 2026-05-14-test-code-audit
- Status: read-only audit
- Current recommendation: Do not edit test code while other agents are actively changing backend/frontend behavior. Use this as a backlog and coordination note.

## Scope
- In scope:
- Review current backend pytest structure.
- Review current frontend Vitest and Playwright E2E structure.
- Identify useful coverage, weak spots, and safe next steps.
- Out of scope:
- Test code modifications.
- Test suite execution with dependency installation.
- Full coverage measurement.

## Inputs Reviewed
- Source docs:
- `docs/reference/project-requirements.md`
- `docs/reference/service-user-flow.md`
- Backend tests:
- `backend/app/tests/*.py`
- Frontend unit tests:
- `frontend/src/**/*.test.ts`
- Frontend E2E tests:
- `frontend/e2e/*.spec.ts`
- Test config:
- `frontend/package.json`
- `frontend/vitest.config.ts`
- `frontend/playwright.config.ts`
- Current worktree note:
- Multiple backend/frontend source files are already modified by other work.
- `backend/app/tests/test_policy_template_defaults.py` is modified.
- `frontend/src/lib/apiBase.test.ts` is a new untracked test file.

## Current Test Inventory
- Backend:
- 11 pytest files plus an empty `conftest.py`.
- About 1,344 backend test lines.
- Main areas covered: schema/model structure, security token decoding, admin console service helpers, auth helper behavior, bingo login service, bingo interaction service, play API helper/schema shape, policy template defaults.

- Frontend unit:
- 8 Vitest files.
- About 732 unit-test lines.
- Main areas covered: bingo game utilities, mock bingo API behavior, public event API error handling, event profile helpers, admin keyword/date/load helpers, auth/session utility behavior, consent template helpers.

- Frontend E2E:
- 5 Playwright specs.
- About 427 E2E lines.
- Main areas covered: landing page smoke, event home privacy dialog, initial bingo setup, keyword exchange success/duplicate/error retry, admin event creation/import flow.

## Backend Assessment
- Strengths:
- Core pure logic and contract-shaped helpers have tests.
- Security token decoding has meaningful tests for RS256, ES256, HS256 fallback, expired token rejection, and RS256/HS256 fallback safety.
- Bingo interaction service tests cover duplicate-direction rejection, receiver board update, interaction creation, name resolution, and cursor use.
- Admin console helper tests cover keyword normalization, schedule validation, role deletion rules, privacy anonymization, and selected keyword resolution.

- Gaps:
- `conftest.py` is empty, and there is no shared DB/session fixture.
- There are no visible FastAPI `TestClient` or `httpx.AsyncClient` route-level integration tests.
- Many backend tests assert route existence, schema fields, or SQLAlchemy table shape rather than behavior through real request/response paths.
- Admin/event/public APIs are not well covered through realistic HTTP requests.
- CSV export endpoints are present in code but not covered with content-level tests.
- Issue #81 regression risk is only indirectly covered. There should be an integration-style test ensuring keyword exchange persistence and board update cannot diverge.
- Supabase/auth dependency behavior is mostly tested as utilities, not as request-level access control.

- Risk:
- The backend suite can catch many local helper regressions, but it may miss wiring errors between routes, dependencies, database models, and service functions.

## Frontend Unit Assessment
- Strengths:
- Pure utility tests are generally appropriate for the current `node` Vitest environment.
- Bingo utility tests cover incoming batch grouping, exchange history grouping, alerts, completed lines, mission progress, and preview boards.
- Admin keyword tests cover normalization, autofill, presets, and board-size-dependent keyword counts.
- Public API tests cover typed 404 behavior and raw slug preservation.

- Gaps:
- `frontend/vitest.config.ts` uses `environment: "node"`, so component/DOM tests are not currently a good fit without changing test setup.
- No React component tests are visible for `Home`, `BingoGame`, `AdminPortal`, landing components, dialogs, or form validation.
- New `frontend/src/lib/apiBase.test.ts` references `window.location.origin` directly. In the current node test environment, `window` is not defined unless the test stubs it. This test is likely to fail as written.
- API wrapper tests are sparse. `admin_api.ts`, `bingo_api.ts`, and several public event API functions lack broad request/response/error coverage.
- There is no explicit unit-level regression test for route/path generation around event slug compatibility.

- Risk:
- Frontend unit tests are good for pure functions, but component and API contract regressions mostly rely on E2E mocks.

## Frontend E2E Assessment
- Strengths:
- Playwright tests cover the main user-facing shell better than unit tests.
- Tests use user-visible roles/labels in many places, which is good for accessibility-aligned regression checks.
- Exchange E2E covers success, mobile touch, duplicate pre-blocking, backend error, and retry.
- Admin event settings E2E covers a meaningful create/import workflow.

- Gaps:
- E2E is mock-backed with `page.route`, not true frontend-backend integration.
- Mock helpers can drift from the real backend contract if schemas change.
- The landing E2E currently expects a button named `"관리자 권한 신청 보내기"`, while the current `AdminApplicationForm.tsx` button text is `"관리자 권한 신청"`. Because that component is currently modified in the worktree, this may be an active in-progress mismatch rather than a settled failure.
- No E2E currently validates actual event-manager request submission success/failure on the landing form.
- No E2E validates admin report/dashboard detail usefulness beyond event setup.
- No E2E validates public terms/privacy pages after the recent legal page changes.
- No E2E validates issue #81 end-to-end against a real backend or a high-fidelity mocked polling/update sequence.

- Risk:
- The E2E suite is useful for UI flow smoke/regression, but not enough to prove backend integration correctness.

## Execution Notes
- Backend pytest was not run:
- `backend/venv` or `backend/./venv/bin/pytest` was not present/executable in this workspace.
- Frontend tests were not run:
- `frontend/node_modules` is not installed in this workspace.
- Installing dependencies was intentionally not attempted during this read-only audit.

## Recommended Next Steps
- Immediate while other agents are editing:
- Do not modify tests yet.
- Share this audit with active agents so they can avoid introducing new fragile tests.
- Ask agents touching tests to keep changes scoped to their feature and avoid broad fixture refactors.

- First safe fixes after current source edits settle:
- Fix or rewrite `frontend/src/lib/apiBase.test.ts` so it stubs `window` or tests the server fallback path under node.
- Update `frontend/e2e/landing-page.spec.ts` if the final admin application button copy remains `"관리자 권한 신청"`.
- Add a small test README note that clarifies which suites are pure unit, mock E2E, and not backend-integrated.

- Backend test improvements:
- Introduce a real async test client fixture and lightweight test database/session fixture.
- Add route-level tests for:
- public event profile lookup and not-found behavior.
- event-manager request creation validation.
- admin event create/update/detail flows.
- CSV export response headers and representative content.
- bingo exchange through route/service/model path, including duplicate-direction rejection and issue #81 board-update consistency.

- Frontend unit improvements:
- Keep most Vitest tests pure unless the project intentionally adds `jsdom` or a component test setup.
- Add API wrapper tests around request URL, payload mapping, success parsing, and error parsing for `bingo_api.ts`, `admin_api.ts`, and public event APIs.
- Add focused pure tests for event route/path helpers and session-state edge cases.

- Frontend E2E improvements:
- Add event-manager application submit success/error tests.
- Add public terms/privacy page smoke tests.
- Add admin event detail/dashboard smoke tests with analytics and participants.
- Add a high-fidelity issue #81 regression E2E: exchange recorded, board refetched/polled, cell state updates, and history remains consistent.
- Later, add one true integration E2E path that runs frontend against a test backend when the backend test environment is stable.

## Priority Recommendation
- P0:
- Do not touch tests while active source edits are unsettled, except for narrowly fixing tests broken by the same feature branch.
- Fix the likely `apiBase.test.ts` node-environment issue before merging that test.
- Align the landing E2E button text with the final application form copy.

- P1:
- Add backend route-level integration tests for event profile, event manager request, admin events, CSV exports, and bingo exchange consistency.
- Add frontend API wrapper tests to reduce mock-contract drift.

- P2:
- Add jsdom/component testing only if the team is ready to own the setup cost.
- Add full frontend-backend integration E2E after stable test DB and service startup are available.
