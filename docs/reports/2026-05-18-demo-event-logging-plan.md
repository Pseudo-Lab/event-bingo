# Homepage And Demo Event Logging Plan

Status: draft  
Created: 2026-05-18  
Scope: homepage `/`, `/demo/play`, and `/demo/play/game` logging

## Goal

Prepare the homepage and demo pages so future experiments can answer:

- How many users visit the main homepage?
- Which homepage sections or CTAs lead users into the demo?
- Which homepage sections or CTAs lead users into the event/admin application form?
- Which users start the demo after landing on the keyword selection screen?
- Whether users reach the required keyword selection count before demo start.
- Where do users stop in the scripted bingo flow?
- Whether the current scripted demo flow is completed or abandoned.
- Do users replay the demo after seeing the goal state?
- Later, which A/B test variant was assigned, exposed, and converted?

This document is a tracking plan only. It does not implement logging.

## Final Scope Decision

MVP should collect experiment-ready source events, but it should not implement an experiment platform yet.

Implement now:

- stable event schema: `event_id`, `schema_version`, `event_name`, `analytics_session_id`, `page_view_id`, and `occurred_at`
- environment separation: `hostname`, `environment`, `deployment_channel`, `is_production_domain`
- route and page lifecycle events for estimated dwell time, bounce rate, and exit route
- homepage funnel events: page view, section exposure, CTA click, admin login click, application form funnel
- demo funnel events: keyword selection view, selection-ready state, start click, game view, exchange step, goal complete, replay
- analysis-safe identifiers: `keyword_id` only when needed, `demo_run_id`, and optionally `board_layout_variant_id` if multiple demo board layouts remain enabled
- privacy controls: no names, emails, free-text values, raw URL query strings, raw IP, or raw user agent in event payloads

Defer until the first real A/B test:

- experiment assignment and exposure logic
- feature flag provider integration
- `experiment_assigned`, `experiment_exposed`, `experiment_conversion`, and `experiment_guardrail_measured` events
- SRM dashboards and experiment result marts
- long-lived `anonymous_user_id` for cross-session experiments
- selected keyword set analysis, unless product decisions require it later
- demo board variant analysis, unless multiple board layouts are intentionally compared later

Rationale: collecting source events now preserves future analysis options. Collecting experiment-specific events before an actual experiment exists adds noise, policy surface area, and implementation cost without improving current product decisions.

## Source Notes

- Material Design defines snackbars as brief, non-blocking feedback for an operation and recommends only one snackbar at a time. This supports keeping the send/receive feedback as a transient surface instead of a blocking modal.
- Atlassian Design describes flags as confirmation/acknowledgment messages requiring minimal interaction. This supports using a prominent but non-blocking confirmation when sending keywords.
- OpenTelemetry describes events as named occurrences with attributes for context. This supports explicit event names plus typed properties instead of ad-hoc text logs.
- Snowplow describes events as JSON objects representing things that happened, with self-describing events and schemas for custom behavior. This supports a versioned demo event schema before adding experiments.
- GA4 recommended events are useful when their prescribed events match product behavior, but the demo flow is domain-specific. GA4-style reporting can be used later, but the source tracking plan should remain product-specific.
- 개인정보보호위원회 materials emphasize purpose-specific handling and, for research/statistics use cases, safe pseudonymized processing. Demo analytics should avoid direct personal identifiers by default.

References:

- Material Design Snackbars and Toasts: https://m1.material.io/components/snackbars-toasts.html
- Atlassian Flag: https://atlassian.design/components/flag
- OpenTelemetry Event Semantics: https://opentelemetry.io/docs/specs/semconv/general/events/
- Snowplow Events: https://docs.snowplow.io/docs/fundamentals/events/
- GA4 Recommended Events: https://support.google.com/analytics/answer/9267735
- 개인정보보호위원회 가명정보 제도 안내: https://www.pipc.go.kr/np/default/page.do?mCode=D040010000

## Principles

- Do not log names, emails, free-text inputs, or raw participant identifiers from real event pages.
- Use a random analytics session ID stored in `sessionStorage`; rotate when the tab/session resets.
- Use low-cardinality event names.
- Put detailed context in event properties, not event names.
- Version the schema from day one: `schema_version: 1`.
- Keep raw event retention short until there is an approved retention policy.
- Separate homepage and demo analytics from real event participant analytics.
- Keep source events experiment-ready, but do not emit experiment-specific events until an experiment exists.
- Prefer stable IDs over display labels. Store copy text, keyword labels, and URL-like values only when there is a clear analysis need.

## Recommended Architecture

Phase 1 should use a thin frontend logging adapter:

```ts
trackSiteEvent(name, properties)
```

The adapter should initially write to `console.debug` in development and no-op in production until the backend endpoint and privacy notice are ready.

Phase 2 should send events to a backend endpoint:

```text
POST /api/analytics/events
```

The backend should validate:

- event name is allowed
- schema version is supported
- required properties exist
- high-cardinality or disallowed fields are rejected

Phase 3 can forward validated events to a warehouse, analytics-dedicated table, GA4, PostHog, or Snowplow depending on the experiment stack selected later.

For production, prefer an analytics-dedicated store or warehouse over the operational transaction tables. GA4, PostHog, or Snowplow can be secondary sinks, but the application should keep one validated source event schema.

Recommended data layers:

- `raw_site_events`: validated source events with short retention.
- `stg_site_events`: type-normalized and deduplicated events.
- `mart_homepage_funnel_sessions`: homepage section, CTA, application, and demo-entry funnel.
- `mart_demo_funnel_sessions`: demo landing, game, step, completion, and replay funnel.
- `mart_experiment_results`: future assignment, exposure, conversion, guardrail, and SRM-ready aggregates.

## Core Properties

Required on every homepage or demo event:

| Property | Type | Notes |
| --- | --- | --- |
| `event_id` | string | Client-generated UUID for idempotency and deduplication |
| `schema_version` | number | Start with `1` |
| `event_name` | string | Low-cardinality event name |
| `event_source` | string | `frontend` for this plan |
| `analytics_session_id` | string | Random UUID, session-scoped |
| `page_view_id` | string | Random UUID for one route render |
| `occurred_at` | ISO string | Client timestamp |
| `app_version` | string | Build version or commit SHA when available |
| `route` | string | `/`, `/demo/play`, or `/demo/play/game` |
| `hostname` | string | Browser hostname, normalized and allowlisted |
| `environment` | string | `production`, `private_dev`, `local`, or `unknown` |
| `deployment_channel` | string | `bingo`, `bingo-private`, `localhost`, or `other` |
| `is_production_domain` | boolean | `true` only for `bingo.pseudolab-devfactory.com` |
| `viewport_bucket` | string | Bucketed width, for example `mobile`, `tablet`, `desktop-sm`, `desktop-lg` |
| `device_class` | string | `mobile`, `tablet`, `desktop` |
| `referrer_type` | string | `direct`, `internal`, `external`, `unknown` |
| `experiments` | array | Optional; empty until experiments are launched |

Avoid by default:

- IP address in event payload
- raw user agent string
- email
- participant name
- free-text search input
- real event slug unless explicitly approved
- raw URL query strings
- raw keyword labels when `keyword_id` is sufficient

Server-side enrichment should add:

- `received_at`
- `ingested_at`
- validation result
- rejection reason, if rejected

Future experiment context object:

| Property | Type | Notes |
| --- | --- | --- |
| `experiment_id` | string | Stable experiment ID, for example `homepage_hero_cta_copy_2026_05` |
| `experiment_version` | string | Version of the experiment config |
| `variant_id` | string | Stable ID such as `control` or `treatment_a` |
| `assignment_id` | string | ID for one assignment decision |
| `assignment_unit` | string | `analytics_session_id` for MVP; future `anonymous_user_id` only after policy review |
| `assignment_method` | string | `deterministic_hash`, `random_session`, or `feature_flag_provider` |
| `assignment_reason` | string | `eligible`, `holdout`, `forced`, `qa_override`, or `not_eligible` |
| `exposure_id` | string | ID for one actual UI exposure |
| `feature_flag_key` | string | Optional flag key if a flag provider is used |
| `feature_flag_version` | string | Optional flag config version |
| `traffic_allocation` | number | Allocation ratio at assignment time |

Experiment note: this object is reserved for future A/B tests. Assignment and exposure are different. Primary analysis should generally use exposed sessions, while SRM checks should compare both assigned and exposed counts.

## Environment Filtering

Production analysis must filter events to the public production domain:

```sql
where environment = 'production'
  and hostname = 'bingo.pseudolab-devfactory.com'
  and is_production_domain = true
```

Recommended environment mapping:

| Hostname | Environment | Deployment Channel | Production Domain |
| --- | --- | --- | --- |
| `bingo.pseudolab-devfactory.com` | `production` | `bingo` | `true` |
| `bingo-private.pseudolab-devfactory.com` | `private_dev` | `bingo-private` | `false` |
| `localhost` | `local` | `localhost` | `false` |
| `127.0.0.1` | `local` | `localhost` | `false` |
| Any other hostname | `unknown` | `other` | `false` |

Until development and production databases are separated, every dashboard query should include an explicit `environment` or `hostname` filter.

The ingestion endpoint should also reject or quarantine events from unknown origins. Dashboard filtering alone is not enough to protect analysis from polluted data.

## Core Metrics

The first dashboard should answer page traffic and funnel questions before deeper experiment analysis.

| Metric | Definition | Source Events |
| --- | --- | --- |
| Homepage views | Count of `/` page views | `homepage_viewed` |
| Homepage sessions | Distinct `analytics_session_id` count on `/` | `homepage_viewed` |
| Homepage to demo conversion rate | `/demo/play` sessions divided by homepage sessions | `homepage_viewed`, `demo_keyword_selection_viewed` |
| Primary CTA click-through rate | `homepage_cta_clicked` sessions divided by homepage sessions | `homepage_viewed`, `homepage_cta_clicked` |
| Section engagement rate | Sessions with at least one `homepage_section_viewed` divided by homepage sessions | `homepage_viewed`, `homepage_section_viewed` |
| Application CTA click-through rate | Sessions clicking an application CTA divided by homepage sessions | `homepage_viewed`, `homepage_cta_clicked` |
| Application form start rate | Sessions starting the application form divided by sessions seeing the apply section | `homepage_section_viewed`, `application_form_started` |
| Application submit success rate | Successful application submissions divided by submit attempts | `application_submit_clicked`, `application_submitted` |
| Admin login click-through rate | Admin login clicks divided by homepage sessions | `homepage_viewed`, `admin_login_clicked` |
| Demo landing views | Count of `/demo/play` page views | `demo_keyword_selection_viewed` |
| Demo landing sessions | Distinct `analytics_session_id` count on `/demo/play` | `demo_keyword_selection_viewed` |
| Keyword-ready rate | Sessions reaching exactly three selected keywords divided by demo landing sessions | `demo_keyword_selection_viewed`, `demo_keyword_selection_ready` |
| Demo game views | Count of `/demo/play/game` page views | `demo_game_viewed` |
| Demo game sessions | Distinct `analytics_session_id` count on `/demo/play/game` | `demo_game_viewed` |
| Start conversion rate | `demo_game_viewed` sessions divided by `demo_keyword_selection_viewed` sessions | `demo_keyword_selection_viewed`, `demo_game_viewed` |
| Start click-through rate | `demo_start_clicked` sessions divided by `demo_keyword_selection_viewed` sessions | `demo_keyword_selection_viewed`, `demo_start_clicked` |
| Replay rate | `demo_replay_clicked` sessions divided by `demo_goal_completed` sessions | `demo_goal_completed`, `demo_replay_clicked` |
| Step drop-off | Sessions reaching each `step_index` divided by `demo_game_viewed` sessions | `demo_game_viewed`, `demo_exchange_advanced` |
| Completion rate | `demo_goal_completed` sessions divided by `demo_game_viewed` sessions | `demo_game_viewed`, `demo_goal_completed` |
| Time to completion | Median elapsed time between `demo_game_viewed` and `demo_goal_completed` per session | `demo_game_viewed`, `demo_goal_completed` |
| Homepage bounce rate | Homepage sessions with no CTA click, no meaningful section engagement, and no demo entry before the session ends | `homepage_viewed`, `homepage_cta_clicked`, `homepage_section_viewed`, `demo_keyword_selection_viewed`, `site_session_checkpoint` |
| Demo landing abandon rate | `/demo/play` sessions without `demo_start_clicked` or `demo_game_viewed` before leaving the route/session | `demo_keyword_selection_viewed`, `demo_start_clicked`, `demo_game_viewed`, `site_route_changed`, `site_session_checkpoint` |
| Demo game abandon rate | `/demo/play/game` sessions without `demo_goal_completed` before leaving the route/session | `demo_game_viewed`, `demo_goal_completed`, `site_route_changed`, `site_session_checkpoint` |
| Exit route distribution | Last route observed before page hidden, route exit, or session checkpoint | `site_route_changed`, `site_session_checkpoint` |
| Average homepage dwell time | Median active time on `/` before route change or session checkpoint | `homepage_viewed`, `site_route_changed`, `site_session_checkpoint` |
| Average demo landing dwell time | Median active time on `/demo/play` before route change or session checkpoint | `demo_keyword_selection_viewed`, `site_route_changed`, `site_session_checkpoint` |
| Average demo game dwell time | Median active time on `/demo/play/game` before route change or session checkpoint | `demo_game_viewed`, `site_route_changed`, `site_session_checkpoint` |
| Scroll depth | Maximum scroll percentage reached per route and section | `site_scroll_depth_updated`, `site_session_checkpoint` |
| Hourly traffic | Event count grouped by hour and route | `homepage_viewed`, `demo_keyword_selection_viewed`, `demo_game_viewed` |

Interpretation notes:

- Use distinct `analytics_session_id` for user-session metrics, not raw event count.
- Keep raw view counts too, because refreshes and repeat views can indicate confusion or replay behavior.
- Treat `/`, `/demo/play`, and `/demo/play/game` as separate funnel steps.
- Segment by `device_class` and `referrer_type` after the base metrics are stable.
- Treat bounce, exit, and dwell-time metrics as estimated values. Browsers do not guarantee perfect exit delivery, so combine route changes, `visibilitychange`, `pagehide`, and the last event timestamp.
- Define "meaningful engagement" before using bounce rate for decisions. Initial recommendation: CTA click, demo entry, scroll past the hero, or active dwell time over 10 seconds.
- For MVP, prefer section exposure events over detailed scroll-depth events. Use thresholds only when the experiment needs them.
- For A/B tests, predefine one primary metric, a small set of secondary metrics, and guardrail metrics before launching.

Future experiment metrics:

| Metric | Definition | Source Events |
| --- | --- | --- |
| Experiment exposure conversion | Conversion sessions divided by exposed sessions per experiment variant | `experiment_exposed`, `experiment_conversion` |
| Experiment guardrail rate | Guardrail metric by variant, for example bounce or JS error rate | `experiment_exposed`, `experiment_guardrail_measured` |
| SRM check | Assigned and exposed counts by variant compared to configured traffic allocation | `experiment_assigned`, `experiment_exposed` |

## Event Catalog

### `homepage_viewed`

When: homepage `/` renders.

Properties:

- `entry_path`
- `source_route`
- `utm_source`
- `utm_medium`
- `utm_campaign`

Risk note: UTM values should be normalized and length-limited before storage.

### `homepage_section_viewed`

When: a homepage section enters the viewport for the first time in a session.

Properties:

- `section_id`
- `section_index`
- `viewport_percent_visible`

Recommended section IDs:

- `hero`
- `events`
- `apply`
- `footer`

### `homepage_cta_clicked`

When: user clicks a homepage CTA.

Properties:

- `cta_id`
- `cta_label` optional
- `cta_destination`
- `section_id`

Recommended CTA IDs:

- `hero_demo_play`
- `nav_demo_play`
- `event_case_apply`
- `application_submit`
- `nav_admin_login`
- `footer_terms`
- `footer_privacy`

Risk note: `cta_id` should be the analysis key. `cta_label` is optional and should be normalized or omitted when copy changes are tested.

### `admin_login_clicked`

When: user clicks the admin login link from homepage navigation or footer.

Properties:

- `section_id`
- `cta_id`
- `cta_destination`

### `application_form_viewed`

When: the application form section enters the viewport.

Properties:

- `section_id`: `apply`

### `application_form_started`

When: user first interacts with the application form.

Properties:

- `field_id`
- `filled_field_count`

Do not log field values.

### `application_validation_failed`

When: client-side application form validation fails.

Properties:

- `field_id`
- `validation_error_type`

Do not log field values.

### `application_submit_clicked`

When: user attempts to submit the application form.

Properties:

- `filled_field_count`
- `has_expected_date`
- `has_attendee_range`
- `has_purpose`

Do not log names, emails, event names, phone numbers, or free-text purpose.

### `application_submitted`

When: application form submission succeeds.

Properties:

- `elapsed_ms_from_form_start`
- `filled_field_count`

### `demo_keyword_selection_viewed`

When: `/demo/play` renders.

Properties:

- `preselected_count`
- `source_route`

### `demo_keyword_toggled`

When: user selects or deselects a keyword.

Properties:

- `keyword_id`
- `selected`
- `selected_count`

MVP note: this event is optional. If the first dashboard only needs start readiness, use `demo_keyword_selection_ready` and `demo_start_clicked` instead of logging every toggle.

### `demo_keyword_selection_ready`

When: selected keyword count reaches the required count for the first time.

Properties:

- `selected_count`

### `demo_start_clicked`

When: user clicks `빙고 시작하기`.

Properties:

- `selected_count`

### `demo_game_viewed`

When: `/demo/play/game` renders.

Properties:

- `demo_run_id`
- `selected_count`
- `board_layout_variant_id` optional

MVP note: `board_layout_variant_id` is only useful if multiple demo board layouts remain enabled. It is a demo-board layout variant, not an A/B test `variant_id`.

### `demo_exchange_advanced`

When: user clicks `보내기` or `키워드 받기`.

Properties:

- `step_index`
- `step_id`
- `action_type`: `send` or `receive`
- `sent_keyword_count`
- `matched_keyword_count`
- `completed_line_count_after`
- `new_line_count`
- `met_participant_count`
- `demo_run_id`

### `demo_goal_completed`

When: goal overlay appears.

Properties:

- `total_steps`
- `final_completed_line_count`
- `elapsed_ms_from_game_view`
- `demo_run_id`
- `board_layout_variant_id` optional

### `demo_replay_clicked`

When: user clicks `다시 체험하기`.

Properties:

- `completed_step_count`
- `completed_line_count`
- `elapsed_ms_from_game_view`
- `demo_run_id`

### `demo_invalid_game_entry_redirected`

When: `/demo/play/game` is opened without enough valid keyword context and redirects to `/demo/play`.

Properties:

- `reason`: `missing_keywords`, `invalid_keywords`, or `insufficient_keywords`
- `keyword_count`

### `site_route_changed`

When: SPA route changes.

Properties:

- `from_route`
- `to_route`
- `duration_ms_on_from_route`
- `max_scroll_percent_on_from_route`
- `last_event_name`
- `engaged`

### `site_session_checkpoint`

When: one of the following happens:

- `visibilitychange` changes to hidden
- `pagehide` fires
- the tab stays active long enough to send an optional heartbeat checkpoint
- the user leaves the current route

Properties:

- `route`
- `active_duration_ms`
- `max_scroll_percent`
- `last_event_name`
- `last_interaction_at`
- `engaged`

Use this event for estimated dwell time, bounce rate, and exit route analysis.

MVP note: start without heartbeat. Add a 30-second-or-longer heartbeat only if route/pagehide checkpoints cannot answer dwell-time questions.

### `site_scroll_depth_updated`

When: user crosses a scroll threshold for the current route or section.

Properties:

- `route`
- `section_id`
- `scroll_percent`
- `threshold`: `25`, `50`, `75`, `90`, or `100`

Deduplicate this event per `analytics_session_id`, route, section, and threshold.

MVP note: homepage section exposure is enough for the first dashboard. Detailed scroll thresholds should be enabled only for experiments that need scroll-depth as a metric.

## Future Experiment Event Catalog

The following events are not part of the MVP source-event implementation. Add them when the first A/B test or feature flag experiment is ready.

### `experiment_assigned`

When: user/session is assigned to an experiment variant.

Properties:

- `experiment_id`
- `experiment_version`
- `variant_id`
- `assignment_id`
- `assignment_unit`
- `assignment_method`
- `assignment_reason`
- `traffic_allocation`

### `experiment_exposed`

When: user/session actually sees the experimental UI or behavior.

Properties:

- `experiment_id`
- `experiment_version`
- `variant_id`
- `assignment_id`
- `exposure_id`
- `page_view_id`
- `route`

### `experiment_conversion`

When: an event counts as a configured experiment conversion.

Properties:

- `experiment_id`
- `variant_id`
- `exposure_id`
- `conversion_name`
- `elapsed_ms_from_exposure`

### `experiment_guardrail_measured`

When: a guardrail metric is emitted or derived for an exposed session.

Properties:

- `experiment_id`
- `variant_id`
- `guardrail_name`
- `guardrail_value`

## Experiment Ideas

- Homepage hero CTA copy: `데모 체험하기` versus `빙고 시작하기`.
- Homepage hero CTA position: top hero only versus repeated mid-page CTA.
- Homepage section order: product value first versus how-it-works first.
- Toast placement: top-center versus bottom-center.
- CTA copy: `빙고 시작하기` versus `데모 시작하기`.
- Board variant distribution: random versus fixed first board.
- First receive behavior: 3 matched + 1 unmatched versus 4 matched.
- Completion overlay copy: `목표 달성!` versus `빙고 완성!`.

Experiment design rules:

- Decide primary metric, secondary metrics, and guardrails before launch.
- Use exposure-based conversion for primary analysis unless the experiment explicitly studies assignment-level impact.
- Run SRM checks on both assigned and exposed counts.
- Exclude `private_dev`, `local`, QA overrides, and unknown hostnames from production experiment analysis.
- Do not use display labels as variant IDs.

## Privacy And Consent Checklist

Before production logging:

- Update privacy notice if analytics events are collected in production.
- Document purpose, collected fields, retention, and opt-out path.
- Keep homepage and demo analytics separate from real event participant records.
- Avoid cross-site tracking identifiers.
- If future analysis combines with account or event participant data, reassess legal basis and pseudonymization approach before implementation.
- Define raw-event retention explicitly before enabling production transport.
- Document external analytics tools and overseas transfer/supplier details before using them.
- Keep raw IP and raw user agent out of event payloads, and review server/proxy logs separately because they may collect them automatically.

## MVP Foundation Implementation Tasks

1. Add `frontend/src/modules/Landing/siteAnalytics.ts` with typed homepage and demo event names and payloads.
2. Generate `analytics_session_id` in `sessionStorage`.
3. Generate `page_view_id` per route render and `demo_run_id` per demo attempt.
4. Add `event_id` to every event and deduplicate by `event_id` in the collector.
5. Add dev-only console transport.
6. Add event calls to homepage components, application form, admin-login link, and `DemoPlayPage`.
7. Add unit tests for payload creation and disallowed fields.
8. Add route lifecycle tracking for SPA route changes, `visibilitychange`, and `pagehide`.
9. Add homepage section exposure tracking; defer detailed scroll-depth thresholds until needed.
10. Add backend ingestion endpoint only after retention/privacy policy is approved.
11. Add dashboard/report queries after the first week of event collection.
12. Add derived dashboard queries for bounce rate, exit route distribution, route dwell time, and step abandon rate.

### Frontend MVP Scope

Implement this first, because it can run as dev-only logging without changing runtime infrastructure:

- Add a typed `trackSiteEvent(name, properties)` adapter under the landing module.
- Generate `analytics_session_id`, `page_view_id`, `demo_run_id`, and `event_id`.
- Add normalized environment metadata: `hostname`, `environment`, `deployment_channel`, `is_production_domain`, `device_class`, and `viewport_bucket`.
- Add central route lifecycle tracking using React Router location changes plus `visibilitychange` and `pagehide`.
- Add homepage events: `homepage_viewed`, `homepage_section_viewed`, `homepage_cta_clicked`, and `admin_login_clicked`.
- Add application form events without field values: `application_form_viewed`, `application_form_started`, `application_validation_failed`, `application_submit_clicked`, and `application_submitted`.
- Add demo events: `demo_keyword_selection_viewed`, `demo_keyword_selection_ready`, `demo_start_clicked`, `demo_game_viewed`, `demo_exchange_advanced`, `demo_goal_completed`, `demo_replay_clicked`, and `demo_invalid_game_entry_redirected`.
- Keep `demo_keyword_toggled` disabled unless per-keyword friction analysis becomes necessary.
- Keep production transport disabled until backend ingestion and privacy notice are approved.
- Add tests for payload creation, required fields, environment mapping, and disallowed fields.

### Backend MVP Scope

Do not implement this until privacy notice, retention, and destination are approved:

- Add `POST /api/analytics/events` or equivalent ingestion endpoint.
- Validate event name, schema version, required fields, allowed routes, allowed environments, and allowed hostnames/origins.
- Reject or quarantine unknown hostnames, unsupported schema versions, high-cardinality fields, raw URL query strings, names, emails, free-text form values, raw IP, and raw user agent.
- Enrich accepted events with `received_at`, `ingested_at`, and validation metadata.
- Deduplicate accepted events by `event_id`.
- Store accepted events in an analytics-dedicated table/schema or external analytics store, not the operational transaction tables.
- Add retention and deletion policy for raw events before production collection.
- Add operational monitoring for rejected event count, invalid schema count, and ingestion failure count.

### Dashboard And Analysis Scope

Build this only after at least a short collection period:

- Homepage funnel: homepage view, CTA click, demo entry, admin login click, application form start, submit attempt, submit success.
- Demo funnel: demo landing, keyword-ready state, start click, game view, exchange step progression, goal completion, replay.
- Estimated engagement: dwell time, bounce rate, exit route, and step abandon rate.
- Production filters: `environment = 'production'`, `hostname = 'bingo.pseudolab-devfactory.com'`, and `is_production_domain = true`.

## Later Experiment Platform Tasks

1. Add experiment assignment/exposure/conversion schema support before the first A/B test.
2. Add deterministic assignment or feature flag provider integration.
3. Add `experiment_assigned`, `experiment_exposed`, `experiment_conversion`, and `experiment_guardrail_measured` events.
4. Add SRM checks and experiment result dashboards.

## Open Decisions

- Analytics destination: analytics-dedicated Supabase table/schema, PostHog, GA4, Snowplow, or warehouse-first custom endpoint.
- Retention period for raw demo events.
- Whether homepage and demo analytics should run on private development domains.
- Whether an opt-out UI is required before public release.
- Whether to introduce a long-lived anonymous user ID for cross-session A/B tests. Default for MVP: no.
- Whether per-keyword toggle analytics are needed. Default for MVP: no; collect only `selected_count` readiness and start.
- Whether demo board layout variants should remain randomized. If fixed, do not collect `board_layout_variant_id`.
- Whether heartbeat checkpoints are needed. Default for MVP: no heartbeat.
