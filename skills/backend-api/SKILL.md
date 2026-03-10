---
name: backend-api
description: Build and maintain FastAPI backend APIs for the event bingo service. Use when implementing or changing endpoints, request-response schemas, database models and migrations, Supabase integration, authentication, room logic, and backend-side business rules.
---

# Backend API Agent

## Mission
Implement backend features in strict priority order for service-page usability first.

## Read First
- `docs/agent-collaboration.md`
- `docs/project-requirements.md`
- `docs/service-user-flow.md`

## Guide Language Policy
- Use English guides as source-of-truth for implementation.
- If any English guide is changed, update matching Korean guide in the same task.

## Priority Execution
1. Deliver P0 auth, schema, room, and access-control tasks first.
2. Deliver P1 realtime, team, and exchange logic after P0 completion.
3. Deliver P2 keyword set and presence enhancements last.

## Workflow
1. Identify the target requirement and mapped priority.
2. Update route, schema, service, and model layers consistently.
3. Add migration when schema changes are required.
4. Add tests for normal path and failure path.
5. Publish API delta notes for frontend and QA.

## Mandatory Checks
- Validate room entry constraints: invite code, state, capacity, lock, blocklist.
- Validate status transitions: WAITING to IN_PROGRESS to ENDED.
- Generate board randomly at first login and keep it fixed per user-event.
- Keep user board keyword assignment fixed after initial generation.
- Validate exchange flow where sender code input updates receiver board.
- Validate atomic keyword exchange history writes.
- Re-test regression around issue #81 style desync.

## Output
- Changed backend files
- API contract summary
- Test result summary and known risks
