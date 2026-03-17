# Event Bingo Product Requirements

## Product Goals
- Let event organizers create and run bingo events with minimal setup.
- Support event configuration: board size, required bingo count, keyword count.
- Let organizers review past events and outcomes.
- Provide reports per event:
- participant count
- interaction graph (who met whom)
- total bingo exchanges
- most selected keywords
- Use Supabase for database and authentication management.

## Delivery Rule
- Support both mobile and web clients for all user-facing flows.
1. Build service page flows first.
2. Build admin and report flows next.

## Service Flow Source
- Primary service-flow reference: `docs/reference/service-user-flow.md`

## Design Guide Source
- UI guide path: `docs/reference/design-guide.md`
- Frontend must apply this guide when it exists.

## Frontend Implementation Baseline
- Keep `React + Vite + TypeScript` as the application shell for frontend work.
- Use Tailwind CSS with `shadcn/ui` as the default UI implementation stack for new and refactored screens.
- Prefer `TanStack Query` for server-state synchronization and `Zustand` for local game and screen state.
- Use `Motion` for meaningful game feedback and transition effects only when it improves clarity.
- Prefer `CSS Grid` plus `SVG` overlays for bingo board layout and completed-line rendering.
- When a screen is substantially refactored, prefer removing legacy `MUI` and `emotion` UI layers unless a documented technical constraint blocks migration.
- When existing frontend screens or components are modified, migrate the touched UI scope toward Tailwind CSS and `shadcn/ui` unless a documented technical constraint blocks migration.
- Do not add new `MUI` or `emotion` usage to expand legacy frontend surface area.

## Language And Sync Rule
- English guides are source-of-truth for implementation.
- Korean mirrors are for Korean contributors and must be updated with every English guide change.

## Backend Priorities

### P0
- Admin JWT auth API (already done)
- Anonymous login with session token
- OAuth2 login (Google, GitHub)
- Anonymous to OAuth account linking
- User JWT dependency (get_current_user)
- event and attendee schema extension
- room create with invite code
- room join validation and blocking checks
- room leave and game status transitions
- service-layer access control
- first-login fixed random board generation per user and event

### P1
- server-side bingo validation logic
- keyword exchange API with atomic history
- event management API (staff actions, export)
- team assignment and team leaderboard API
- WebSocket infrastructure and broadcast payloads
- Debug issue #81 (keyword exchange recorded but board not updated)

### P2
- keyword_sets bulk table and API
- event co-host table
- real-time online presence tracking

## Frontend Priorities

### P0
- Supabase client setup
- waiting room sync UI
- variable bingo grid (3x3 and 5x5)
- apply existing bingo design to service page first
- login to keyword-select to game-screen primary flow

### P1
- real-time lobby list and filters
- keyword selection and user state visualization
- global game state management and subscription logic
- team panel state and progress rendering

### P2
- bingo completion effects and winner popup

## Infra and DevOps Priorities
- Deployment GitOps repository for k3s/ArgoCD manifests: `https://github.com/Pseudo-Lab/DevFactory-Ops`

### P0
- migrate Docker Compose to k3s
- configure ArgoCD GitOps deployment in `Pseudo-Lab/DevFactory-Ops`
- sealed secrets for Supabase keys
- Nginx ingress and cert-manager SSL
- CI: GitHub Actions build and GHCR publish

### P1
- migrate existing Postgres data to Supabase
- VictoriaMetrics and Gatus availability checks






