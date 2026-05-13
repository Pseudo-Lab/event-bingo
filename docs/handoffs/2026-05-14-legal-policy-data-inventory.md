# Agent Handoff Template

## Task Metadata
- Task ID: 2026-05-14-legal-policy-data-inventory
- Prepared for: legal / policy drafting agent
- Context: Legal/policy drafting work is preparing service terms and privacy policy for Event Bingo.
- Current product stage: Pilot / MVP preparation. Treat this as a data inventory for accurate drafting, not as a signal that formal commercial billing or PG integration is active.

## Scope
- In scope:
- Summarize what personal data the current service collects, stores, displays, exports, or keeps in browser storage.
- Separate current pilot/MVP data from future commercialization/payment data.
- Highlight privacy-policy items that need legal or operator confirmation.
- Out of scope:
- Drafting final legal text.
- Legal advice on lawful basis, tax, corporate form, PG contracts, or public launch readiness.
- Adding product requirements or implementation work.

## Inputs Used
- Source docs:
- `docs/reference/privacy-compliance-guide.md`
- `docs/reference/project-requirements.md`
- `docs/reference/service-user-flow.md`
- `docs/handoffs/2026-05-14-service-commercialization-and-payment-notes.md`
- Current code paths:
- `backend/app/models/user.py`
- `backend/app/models/admin.py`
- `backend/app/models/event.py`
- `backend/app/models/event_attendee.py`
- `backend/app/models/event_manager_request.py`
- `backend/app/models/bingo/bingo_boards.py`
- `backend/app/models/bingo/bingo_interaction.py`
- `backend/app/api/events/schema.py`
- `backend/app/api/admin/routes.py`
- `backend/app/api/admin/console_services.py`
- `backend/app/core/dependencies.py`
- `backend/app/api/admin/auth.py`
- `frontend/src/utils/authSession.ts`
- `frontend/src/utils/adminSession.ts`
- `frontend/src/utils/recentBingoAccounts.ts`
- `frontend/src/lib/supabaseClient.ts`
- `frontend/src/utils/bingoGoogleBridge.ts`
- Legal reference checked:
- Personal Information Protection Act definitions and privacy-policy/w委탁/overseas-transfer requirements.
- PIPC current privacy-policy guideline page: https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000&nttId=12018
- Additional constraints:
- This repository has no active billing/customer/payment model at this stage.
- Commercialization notes explicitly say not to add billing tables, payment UI, pricing gates, or entitlement logic until real paid pilots exist.

## Executive Summary
- Current Event Bingo data should be treated as privacy-law relevant because it processes names, emails, login identifiers, Google/Supabase identifiers, event participation, keyword selections, bingo progress, interaction history, reviews, and admin/operator data.
- Current code does not intentionally collect resident registration numbers, driver license numbers, passport numbers, foreign registration numbers, raw card data, or other obvious unique identification information.
- Current code does not intentionally collect sensitive information, but event keywords and free-text reviews can accidentally contain sensitive data. The policy and product copy should discourage or prohibit entering sensitive data unless a future event explicitly handles it with separate review and consent.
- At pilot stage, there is no customer/company, contract, invoice, tax-invoice, payment status, PG webhook, or package/plan data in the application.
- If this becomes a paid B2B service, billing/customer data should be documented as a separate processing scope and kept separate from participant gameplay data.

## Current Data Inventory
| Area | Data items | Storage / processing point | Personal-data assessment |
|---|---|---|---|
| Participant account | `user_id`, `user_name`, `user_email`, `login_id`, `password_hash`, `auth_provider`, `provider_id`, `umoh_id`, `created_at` | `bingo_user` table | Personal data. Email, name, provider ID, and login identifier identify or can identify a participant. Password is hashed but still credential data. |
| Participant consent/legacy flags | `privacy_agreed`, `agreement_at` | `bingo_user` table | Personal data because tied to user account. Existing guide says historical consent flags should not be treated as separate optional consent unless exact text/version/action path were recorded. |
| Participant review on user record | `rating`, `review` | `bingo_user` table and review API | Personal data when linked to user. Review free text can contain sensitive or third-party data if users enter it. |
| Event attendance | `event_id`, `user_id`, `room_id`, `team_id`, `selected_keywords`, `rating`, `review`, `created_at` | `event_attendees` table | Personal data because event participation and selected keywords are linked to a user. |
| Bingo board | `user_id`, `event_id`, `display_name`, `board_data`, `bingo_count`, `user_interaction_count`, timestamps | `bingo_boards` table | Personal data. Board data includes selected keywords, completed cells, and `interaction_id` references to other participants. |
| Keyword exchange / interaction | `interaction_id`, `word_id_list`, `send_user_id`, `receive_user_id`, `event_id`, `created_at` | `bingo_interaction` table | Personal data. This is a traceable interaction graph between participants. |
| Participant search/display | Search by display name/user name/email, returns participant `user_id` and display name | `/api/auth/bingo/search`, game UI | Personal data. Email is used for search matching but not returned in participant search response. |
| Admin/operator account | `id`, `email`, `password` hash, `name`, `role`, invitation token hash/expiry/sent time, timestamps | `admins` table | Personal data and credential/security data. |
| Admin session | Admin `id`, email, name, role, Supabase access token | Browser `sessionStorage` key `event-bingo.admin-session.v1` | Personal data and session credential data. Should be covered under login/session handling and security measures. |
| Participant browser session | Participant `userId`, `userName`, `loginId`, optional `userEmail` | Browser `sessionStorage` keys `myID`, `myUserName`, `myLoginId`, `myUserEmail` | Personal data stored locally in the browser session. |
| Recent account shortcut | Recent `userName`, `loginId`, `lastUsedAt` | Browser `localStorage` key `bingo.recentAccounts.v1`, retained up to 30 days in code | Personal data stored locally. Should be disclosed if policy covers browser storage/local storage. |
| Supabase auth session | Supabase auth session under storage key `event-bingo.supabase.auth.v1` | Browser `sessionStorage` via Supabase client | Personal data/session credential data. Supabase also processes auth data. |
| Google/Supabase profile bridge | Google email, display name, optional avatar URL, Supabase user metadata keys for bingo login/user ID/name/bridge key | Supabase auth/user metadata and frontend bridge logic | Personal data. Avatar URL appears in profile extraction logic, but confirm whether it is displayed or stored beyond Supabase metadata. |
| Event configuration | Event name, slug, location, event team, start/end time, admin ID/email, board size, success condition, keywords, game mode/team size, publish state | `events` table and public event APIs | Some fields may be personal or business contact data, especially admin email, event team, location, and custom keywords. |
| Event manager request / lead intake | Name, email, organization, event name, event purpose, expected date, expected attendee count, notes, status, review note, reviewer admin ID, timestamps | `event_manager_requests` table | Personal data for prospective organizer/contact person. Notes and event purpose are free text and may contain personal data. |
| Policy templates | Policy markdown content, template key, updated admin ID, timestamps | `policy_templates` table | Usually not data subject personal data, except updater admin linkage and any personal/contact info embedded in content. |
| Admin reports / dashboard | Participant name, email, progress percent, keywords, aggregate analytics, keyword rankings, bingo distribution, review metrics | Admin event detail API | Personal data for participant list; aggregate analytics are lower risk if not re-identifiable. |
| CSV exports | Attendance CSV: ID/name/email/rating/review/created time. Bingo participation CSV: ID/name/email/bingo count/interaction count/selected words. Interaction CSV: receiver/sender IDs/names/keywords/timestamp. | `/api/admin/download-*` endpoints | High-risk export of personal data. Needs access control, retention, recipient role, and onward-sharing rules. |
| Logs | Backend logger currently logs selected words in `BingoUser.update_selected_words`; integration routes print Notion/email webhook payloads. | Application logs / stdout | Potential personal data leakage depending on payload. Review before production/pilot with real users. |

## Current External Processors / External Services
- Supabase:
- Used for authentication/session and PostgreSQL database hosting.
- Backend verifies Supabase JWTs and maps `sub` plus `email` to admin or bingo user records.
- Environment examples reference Supabase pooler host `aws-1-ap-southeast-2.pooler.supabase.com`; production region/country must be confirmed before publishing overseas-transfer text.
- Google Sign-In / Google Identity:
- Used as identity provider through Supabase and frontend Google Identity script.
- Service receives Google/Supabase user email and profile metadata such as name/full name and optional avatar URL.
- SMTP email provider:
- Code supports SMTP for admin access-granted email.
- Actual vendor is environment-specific and not identifiable from source. Policy must not name a placeholder as fact.
- Infrastructure:
- Production deployment details and hosting region should be confirmed outside this application repository if needed.

## Current Visibility / Sharing
- Participants can search/select another participant by name/email matching and see display names in interaction flows.
- Interaction responses include sender and receiver names.
- Admins/event managers can view participant names, emails, progress, selected keywords, and analytics in the admin console.
- Admin CSV exports can include direct identifiers and interaction relationships.
- If an event host or external organizer receives participant-level data, legal should decide whether that is internal handling, processor access, joint/separate controller handling, or third-party provision. The existing privacy guide flags separate event-host reuse for independent purposes as likely third-party provision.

## Retention / Deletion Facts
- Current privacy guide recommends deleting or anonymizing direct participant identifiers within one year after event end for one-off events.
- Code has `PERSONAL_DATA_RETENTION_DAYS`, default `365`, and `redact_expired_event_personal_data`.
- That redaction helper only runs on startup if `PRIVACY_REDACTION_RUN_ON_STARTUP=true`.
- Code also has admin reset/delete flows for event runtime data.
- There is no always-on scheduler visible in the current code. Published retention text must match the actual operations setting.
- Browser recent account data has a 30-day retention window in frontend code.

## Current Policy Drafting Notes
- Recommended current stance:
- Frame the product as pilot/MVP event service, not full commercial SaaS/payment platform.
- Separate platform policy from event participant notice.
- Disclose core processing as service provision: login, participant identification, board generation, keyword exchange, progress tracking, admin report/analytics, support/security.
- Disclose reviews/ratings and CSV exports clearly.
- Avoid claiming no third-party sharing unless the role of external event hosts and organizers is confirmed.
- Avoid broad marketing/recommendation/reuse language unless a separate consent path exists.
- Avoid saying retention is automated unless production has actually enabled and verified redaction.

## Sensitive / Unique Identification Review
- No explicit collection fields were found for:
- resident registration number
- driver license number
- passport number
- foreign registration number
- raw card number or CVC
- health, biometric, political, religious, sexual, criminal, or union data
- Risk remains through:
- free-text `review`, `notes`, `event_purpose`
- custom event keywords
- participant-entered display names
- Legal/product should add guidance that users and organizers should not enter sensitive information unless a specific event has a reviewed separate basis and notice.

## Commercialization / Payment Caveat
- The current repository does not have:
- customer/company model
- contract/order model
- invoice/tax-invoice fields
- billing email/contact fields beyond current admin/event-manager request data
- plans/packages/subscriptions/entitlements
- payment attempts, PG transaction IDs, webhook logs, refunds, or payment status
- raw card data handling
- Commercialization handoff says billing is future research and should not be implemented until real paid pilots or repeatable packages exist.
- If paid B2B pilot starts, expected additional data may include:
- customer/company profile
- customer contact person name, email, phone if introduced, organization, department
- billing contact and billing email
- contract/order reference
- service period/event entitlement scope
- invoice/tax-invoice issued/paid/canceled status
- admin notes and audit trail
- business registration data if collected for vendor/tax-invoice processes
- payment provider transaction ID, order ID, payment status, refund/cancel status, webhook payload metadata
- Do not store raw card data. Future PG integration should use hosted widgets/checkout and provider tokens.

## Legal / Operator Confirmation Questions
- Who is the controller for each event: DevFactory/platform operator, event host, or both?
- Are event managers internal staff or external organizers?
- Does any external organizer receive participant-level data or CSV exports?
- Will participant data be reused across events for recommendations, marketing, audience building, or sponsor delivery?
- Are events open to minors or children under the applicable consent threshold?
- What is the production Supabase region and hosting location?
- What SMTP/email vendor is actually used in production?
- Is redaction enabled in production, and who verifies deletion/anonymization after events?
- Are exported CSVs stored outside the system, and who controls retention/destruction after export?
- Will pilot organizers need a separate event-specific privacy notice with their own controller/contact details?
- Is there any planned paid pilot, invoice, tax-invoice, or payment collection in the near term?

## Suggested Language Direction For Drafting
- For pilot stage, legal should avoid describing unavailable features such as subscriptions, online checkout, card payment, tax-invoice issuance inside the app, or customer portals.
- Terms can describe the service as an event bingo/networking pilot service with organizer-admin tools and participant flows.
- Privacy policy should cover current platform/participant processing and leave paid billing/payment as "not currently provided" or omit it until implemented.
- If a paid pilot is handled manually outside the app, the contracting/billing party should separately document invoice/tax handling, rather than implying the application processes payment data.

## Validation
- Tests run:
- Not applicable. This is a documentation handoff only.
- Results:
- Data inventory was traced from current models, API schemas/routes, frontend storage utilities, and existing privacy/commercialization handoff docs.
- Not run and reason:
- No code behavior changed.

## Risks
- Known risks:
- Current repo has several unrelated uncommitted changes. This handoff intentionally adds only this document.
- Production operational facts are not fully encoded in source: legal entity/controller, Supabase region, SMTP vendor, hosting region, event host role, and export retention need confirmation.
- Logs and CSV exports can contain participant personal data and should be reviewed before real external pilots.
- Follow-up needed:
- Legal/policy agent should draft pilot-appropriate terms/privacy text using this inventory.
- Product/operations owner should answer the confirmation questions above before public launch or paid pilot.

## Next Owner
- Owner:
- Legal / policy drafting agent, with Product Owner and operations input.
- Expected next action:
- Draft or revise platform privacy policy, event participant notice, and terms using current pilot-stage data handling only.
