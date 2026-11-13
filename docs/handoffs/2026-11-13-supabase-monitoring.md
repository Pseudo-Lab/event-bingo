# Supabase dependency monitoring

## Requested behavior

- Run a read-only database check every six hours, four times daily.
- Detect Supabase authentication outages and report failure and recovery through the existing Gatus Discord provider.
- Free-plan activity thresholds are not guaranteed by this schedule.

## Implementation and verification

- `/health/db` opens the configured application database session, sets transaction read-only and a five-second statement timeout, then executes `SELECT 1`. The session closes without committing. Overall execution is bounded by ten seconds. Failure returns a generic 503 without connection details.
- `/health/auth` calls Supabase Auth settings with the existing server-side API key and checks that Google is enabled. Connection failure, timeout, HTTP failure and disabled Google return sanitized 503 responses. These symptoms do not prove that the project was paused.
- Existing process liveness stays on `/health`. No background scheduler runs inside FastAPI workers.
- Related ASGI regression tests passed, including database failure sanitization, read-only query behavior and authentication failures.

## Ops integration and activation

- Prepared independently of the renewal branch in `codex/bingo-supabase-monitor-20261113` in both application and Ops repositories.
- Gatus database interval is 6h, with alert on the first failed check and recovery notification. Detection may therefore take up to six hours.
- Gatus authentication interval is 5m, with two consecutive failures and recovery notification. This frequency is a proposed monitoring default separate from the approved database activity schedule.
- Existing Discord webhook configuration is reused. No new webhook or secret was created, and no real notification delivery test was sent.
- Ops ingress must route `/health(/|$).*` to the backend. Before this change the public `/health` path served the frontend HTML with 200.
- Deploy the backend image first, verify both dependency endpoints, then enable the Ops checks. A healthy response must contain the expected JSON status, not just HTTP 200.
- The database check targets the configured application DB. The isolated development environment uses local PostgreSQL, so its database endpoint does not generate activity in the separate development Supabase project. Development Supabase keepalive still requires a database credential or narrowly scoped Data API read.
- Production activation and Discord delivery are pending. Kubernetes access was not available from this task host. GitHub publication is constrained by the shared after-work time setting, 20:45 Asia/Seoul on 2026-11-13.

## References

- https://supabase.com/docs/guides/platform/free-project-pausing
- https://github.com/TwiN/gatus
