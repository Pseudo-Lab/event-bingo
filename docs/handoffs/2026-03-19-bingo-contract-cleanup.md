## Task Metadata
- Task ID: 2026-03-19-bingo-contract-cleanup

## Scope
- In scope:
  - Remove backend bingo board endpoints that were superseded by `POST /api/bingo/interactions`
  - Verify the current frontend and backend tests still pass against the unified interaction flow
- Out of scope:
  - Remove legacy auth lookup endpoints under `/api/auth/bingo/*`
  - Change DB schema or interaction response shape

## Inputs Used
- Source docs:
  - `docs/reference/project-requirements.md`
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - Preserve the unified interaction contract used by the frontend
  - Do not remove `BingoBoards.get_user_selected_words`, because the interaction service still depends on it

## Changes Made
- Files changed:
  - `backend/app/api/bingo/bingo_boards/routes.py`
  - `backend/app/api/bingo/bingo_boards/services.py`
  - `backend/app/api/bingo/bingo_boards/schema.py`
  - `backend/app/models/bingo/bingo_boards.py`
- Behavior changes:
  - Removed `GET /api/bingo/boards/selected_words/{user_id}`
  - Removed `PUT /api/bingo/boards/bingo_status/{send_user_id}/{receive_user_id}`
  - The supported exchange path is now the interaction contract centered on `POST /api/bingo/interactions`

## Validation
- Tests run:
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_bingo_interaction_services.py`
  - `npm run lint`
  - `npm run build`
  - `npm run test`
  - `npm run e2e`
- Results:
  - All commands passed
- Not run and reason:
  - Full backend test suite was not run because this task only touched bingo board routing/model cleanup and the repo currently exposes a targeted interaction service test

## Risks
- Known risks:
  - External clients outside this repo that still call the removed board endpoints will break
  - Legacy auth lookup endpoints remain and may still be ambiguous for duplicate names
- Follow-up needed:
  - If no external client depends on them, remove `/api/auth/bingo/get-user*` in a separate compatibility review

## Next Owner
- Owner: frontend or backend
- Expected next action:
  - Continue expanding Playwright coverage for real exchange/retry/error scenarios and retire remaining unused public endpoints after compatibility confirmation
