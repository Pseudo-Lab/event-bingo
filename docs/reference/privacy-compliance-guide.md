# Privacy Compliance Guide

## Purpose
- Provide an implementation and operations baseline for the bingo service privacy notice and privacy policy.
- Distinguish between:
- processing that can usually rely on service provision / contract performance
- processing that requires separate user consent
- data sharing that is likely third-party provision versus commissioned processing

## Product Baseline
- The bingo login screen must not force a blanket mandatory consent checkbox for all required service data.
- The service must expose:
- a DevFactory platform privacy-policy page at a stable public URL such as `/privacy`
- an event-specific participant privacy notice before login, ideally also with a stable public event URL such as `/event/:slug/privacy`
- The platform privacy page must be stable enough to use as the privacy policy URL in Google OAuth consent-screen settings.

## Privacy Policy Minimum Structure
- Identify the controller or operating party and the scope of the policy.
- Separate no-consent processing from consent-based processing when describing items and legal basis.
- List:
- processing purposes
- categories of personal data
- retention period or retention rule
- third-party provision details if applicable
- commissioned processors if applicable
- overseas transfer details if applicable
- data subject rights and contact method
- destruction procedure
- security measures at a high level
- policy change notice method

## Separate Consent Matrix
| Scenario | Separate consent | Notes |
|---|---|---|
| Login, participant identification, board generation, keyword exchange, progress tracking | Usually not required | Treat as minimum data for service provision when the scope is necessary and clearly disclosed |
| User-submitted ratings or review text used inside the event result flow | Usually not required | Still disclose purpose, retention, and visibility clearly |
| Internal aggregated analytics for operating the same event or service | Usually not required | Keep it within the disclosed purpose range |
| Cross-event profiling, recommendations, or reusable marketing audience building | Required or strongly recommended | This goes beyond minimum service operation |
| Sponsor sharing, partner delivery, or organizer-side reuse for their own independent purpose | Usually required | Review as likely third-party provision |
| Sensitive data collection | Required | Must be handled separately and conservatively |
| Processing for children under the applicable age threshold | Required | Review guardian-consent obligations separately |

## Third-Party Provision Vs Commissioned Processing
| Situation | Default classification | Why |
|---|---|---|
| Admins or event managers acting inside the same controller organization under internal authority | Internal handling | Control does not move outside the controller |
| A separate event host receives participant data for its own independent operation or marketing | Likely third-party provision | Control and benefit move to another entity |
| Cloud DB, auth, email, or infrastructure vendors operating under our instructions | Usually commissioned processing | They process on behalf of the controller |
| A vendor outside Korea stores or processes service data | Commissioned processing plus overseas-transfer review | Additional disclosure or transfer basis may be required |
| Google Sign-In returning user profile data to our app | OAuth identity integration, not a substitute for our privacy policy | Google consent covers Google account access, not all downstream in-service processing |

## Event Bingo Specific Review Checklist
- Confirm who the actual controller is for each event:
- the platform operator only
- the event host only
- joint or separate roles that require extra notice
- If the platform and the event host have different roles, publish separate notices instead of collapsing both scopes into one template.
- Confirm whether event managers shown in the admin console are internal staff or external organizers.
- Confirm whether participant name, email, keyword, or progress data is disclosed to any separate organizer entity.
- Confirm whether Supabase region, email delivery, analytics, or storage vendors create overseas transfer obligations.
- Confirm whether any optional purpose exists beyond core event operation.
- If optional purpose exists, add:
- separate checkbox wording
- consent logging
- versioned notice text
- clear decline path without bundling it into mandatory service data

## Archive Retention Pattern
- Keep event metadata and anonymized/aggregated analytics separately from direct participant identifiers.
- For one-off events without ongoing participant support, prefer:
- deleting or anonymizing direct identifiers such as name, email, login identifier, event display name, and free-text review within one year after event end
- retaining only anonymized statistics and event archive content for longer-term showcase or service analytics use
- Do not treat a stable internal user id as fully anonymous if the service can still reasonably link it back to a person.

## Google OAuth Operations
- Keep the production homepage URL and the production `/privacy` URL configured in Google Cloud OAuth consent-screen settings.
- Keep the DevFactory platform policy and the event-participant notice consistent where their scopes overlap.
- If requested scopes or Google-data usage change, update the public privacy page and in-product notice together.

## Implementation Notes
- Default privacy text in code should be conservative and must not claim third-party sharing or no-sharing facts that operations cannot prove.
- When facts are deployment-specific, require admin review before publishing changes.
- Historical “consent granted” flags must not be used as evidence for separate optional consent unless the exact consent text, version, timestamp, and action path were recorded.

## Current Repo Fact Check (2026-04-15)
- Controller / operator:
- Repo-visible service labels point to `PseudoLab` / `DevFactory` (`frontend/src/config/eventProfiles.ts`, `frontend/src/modules/Bingo/BingoGame.tsx`, `frontend/LICENSE`), but no single legal-entity name is centrally configured in app settings.
- Commissioned processors:
- The current production-facing draft assumes `Supabase` for auth/database processing and an SMTP email-delivery vendor for admin invitation / notification mail flows.
- The exact SMTP vendor name is not configured in source, so the published policy must replace the placeholder with the real contracted provider.
- Overseas transfer:
- Environment examples reference a Supabase pooler host under `aws-1-ap-southeast-2.pooler.supabase.com`; if production uses that setup, the Supabase transfer destination should be disclosed as the actual configured region country/city.
- If the SMTP vendor is outside Korea, its country/city and transfer details must also be disclosed.
- Retention:
- The codebase has manual event reset/delete flows, but no automated deletion scheduler or retention enforcement job.
- The codebase now includes a startup-triggerable redaction helper for expired event personal data, but operators must explicitly enable it and verify the resulting archive behavior in production.
- Published retention periods must therefore match actual operations, not just the code default.
