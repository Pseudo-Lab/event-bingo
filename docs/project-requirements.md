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
- Primary service-flow reference: `docs/service-user-flow.md`

## Design Guide Source
- UI guide path: `docs/design-guide.md`
- Frontend and design-fe must apply this guide when it exists.

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



