# Supabase dependency monitoring

## Requested behavior

- Run a read-only database check every six hours, four times daily.
- Report database check failure and recovery through the existing Gatus Discord provider. The user approved removing the separate five-minute authentication poll.
- Free-plan activity thresholds are not guaranteed by this schedule.

## Implementation and verification

- `/health/db` opens the configured application database session, sets transaction read-only and a five-second statement timeout, then executes `SELECT 1`. The session closes without committing. Overall execution is bounded by ten seconds. Failure returns a generic 503 without connection details.
- Existing process liveness stays on `/health`. No background scheduler runs inside FastAPI workers.
- Database regression coverage includes failure sanitization, read-only query behavior and query timeout/session closure. Authentication monitor code and its tests were removed with the rejected polling scope.

## Ops integration and activation

- Prepared independently of the renewal branch in `codex/bingo-supabase-monitor-20261113` in both application and Ops repositories.
- Gatus database interval is 6h, with alert on the first failed check and recovery notification. Detection may therefore take up to six hours.
- Gatus HTTP timeout is 15s so the backend's bounded query can return its failure result before the monitor times out.
- Existing Discord webhook configuration is reused. No new webhook or secret was created, and no real notification delivery test was sent.
- Ops ingress must route `/health(/|$).*` to the backend. Before this change the public `/health` path served the frontend HTML with 200.
- Deploy the backend image first, verify `/health/db`, then enable the Ops database check. A healthy response must contain the expected JSON status, not just HTTP 200.
- The database check targets the configured application DB. The isolated development environment uses local PostgreSQL, so its database endpoint does not generate activity in the separate development Supabase project. Development Supabase keepalive still requires a database credential or narrowly scoped Data API read.
- Confirmed development Supabase Auth health returns 200 while anonymous Data API access returns 401. Do not treat this as a working development DB activity schedule.
- Production activation and Discord delivery are pending. Kubernetes access was not available from this task host. GitHub publication is constrained by the shared after-work time setting, 20:45 Asia/Seoul on 2026-11-13.

## References

- https://supabase.com/docs/guides/platform/free-project-pausing
- https://github.com/TwiN/gatus
