# Agent Handoff Template

## Task Metadata
- Task ID: 2026-05-14-service-commercialization-and-payment-notes
- Prepared for: CTO / service development lead agent
- Context: User asked about JoCoding's AI-service monetization examples and how that might inform a later formal launch of this side project.
- Current priority: Low / research backlog. Do not treat commercialization, billing, or PG integration as an active implementation requirement at the current project stage.

## Scope
- In scope:
- Summarize publicly verifiable information about JoCoding's AI service / payment / monetization examples.
- Separate confirmed public facts from inference.
- Capture implications for Event Bingo if it later moves from side project to formal B2B service.
- Out of scope:
- Legal, tax, or accounting advice.
- Private details of JoCoding's actual PG contracts, merchant accounts, tax filings, or internal company structure.
- Immediate implementation of payment, billing, contract, or tax-invoice features in this repository.

## Inputs Used
- Public sources:
- JoCoding official profile/about page: https://jocoding.net/about/
- JoCoding course site: https://jocoding.net/
- YouTube/video-summary source for the AI Product Builder / vibe-coding bootcamp mention: https://lilys.ai/notes/ko/openclaw-clawdbot-20260203/ai-news-devs-qwen3-clawdbot-nvidia-hyundai
- Stripe global availability page: https://stripe.com/global
- Stripe requirements for opening an account in another country: https://support.stripe.com/questions/requirements-to-open-a-stripe-account-in-another-country
- Toss Payments payment product docs: https://docs.tosspayments.com/guides/v2/get-started/payment-products
- Toss Payments payment method policy docs: https://docs.tosspayments.com/guides/v2/get-started/payment-methods
- National Tax Service business registration guide: https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7778&mi=2222
- National Tax Service electronic tax invoice / invoice information and penalty guidance:
- https://nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7790&mi=2464
- https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?nttSn=1432
- Additional constraints:
- Current repository source-of-truth docs remain unchanged.
- This is a planning/handoff note, not a product requirement change.

## Summary
- The video/user memory most likely refers to JoCoding's "vibe coding one-person startup / AI Product Builder" content rather than a single generic payment tutorial.
- Publicly visible summaries describe a bootcamp flow that covers planning, development, deployment, analytics, monetization, and payment-capable product building.
- A third-party transcript/summary of a JoCoding AI news video says the week-3 bootcamp service was a global service with real payment enabled and made USD 35.91 in one day.
- JoCoding's own profile presents him as operating business entities, including JoCoding AX Partners, JoCoding, Inc., and Codemafia. Therefore, it is reasonable to assume his commercial services are operated through some business entity, but the exact entity or merchant account behind a specific demo cannot be confirmed from public sources alone.
- For Event Bingo, the more likely commercial path is B2B service provision to organizers rather than public self-serve checkout. Treat PG/card payment as a later optional channel, not the default monetization architecture.
- At the current product stage, this should remain a general research topic. No architecture should be added solely for monetization until a real paid pilot or customer request exists.

## Current Position
- Do not optimize for payment yet.
- Treat "commercialization" as future B2B service operations research, not near-term code scope.
- Current project maturity is best described as service MVP / pilot preparation:
- Source-of-truth docs prioritize service-page P0/P1 first, then admin and reports.
- The codebase already has event-specific public routes, participant bingo flow, admin event settings, admin event detail analytics, CSV exports, admin/event-manager roles, event-manager request intake, and privacy-policy/participant-notice surfaces.
- The codebase does not have customer accounts, contracts, invoices, billing status, tax-invoice support, payment provider integration, or package/plan concepts.
- Therefore, avoid introducing billing tables, payment UI, pricing gates, or customer entitlement logic until the event workflow and report value are stable with real pilots.
- The likely future path is closer to service delivery and B2B billing than consumer checkout:
- Quote or service proposal.
- Order form or service agreement.
- Event setup and operation.
- Report/analytics delivery.
- Account transfer and tax invoice, if applicable.
- Manual admin entitlement.
- Self-serve PG/card payment is a later option only if repeatable low-touch packages emerge.
- Keep the product roadmap focused on service value first: event creation, participant experience, admin/report quality, privacy posture, and operational reliability.

## Project-Level Assessment
- What already supports a future B2B service:
- Event catalog and per-event URLs can support organizer-facing pilots.
- Admin event settings already cover event name, team, date/time, location, board size, success condition, keywords, and contact email.
- Public event privacy notice and platform privacy policy are already first-class surfaces, which is useful for B2B trust.
- Admin event detail includes participants and basic analytics: review participation, average review score, keyword counts, bingo distribution, and operating minutes.
- CSV export endpoints exist for attendance, bingo participation, and interactions.
- Event manager request intake already acts like an early lead/application funnel.

- What is not yet at commercial-grade level:
- No explicit customer/company model.
- No service package, quote, contract/order, invoice, or payment status model.
- No formal support/SLA, incident, or event-operations workflow.
- Report value is basic and should be validated with real organizers before pricing.
- CSV exports and analytics exist, but interaction graph/report outcomes from product requirements should be reviewed against actual customer needs.
- Privacy retention/redaction and production policy facts still need operational confirmation before paid use.

- Practical conclusion:
- The near-term best move is not billing architecture. It is pilot-readiness: make the service reliable enough for a small number of organizer-led events, then use feedback to learn whether the paid value is event operation, analytics/reporting, custom setup, or a reusable tool subscription.

## Confirmed Public Facts
- JoCoding's official profile lists him as:
- JoCoding creator.
- Co-CEO of "주식회사 조코딩 AX 파트너스".
- Founder & CEO of "JoCoding, Inc."
- CEO of "주식회사 코드마피아".
- The same profile says JoCoding runs a company-level "Product Builder" system for rapidly planning, building, and launching AI products.
- The profile lists currently operating products such as AI advertising generation, AI subtitles/translation/dubbing, and AI companion services.
- The profile also references the older "animal face test" service as an example of a viral AI service that used static web / on-device AI to keep operating cost near zero and still generate revenue.
- The JoCoding course site lists courses around "AI revenue projects", "vibe coding one-person startup bootcamp", "ChatGPT API revenue web service", and "LangChain AI agent web service".

## Inferences To Treat Carefully
- It is likely that JoCoding's payment-enabled demos are backed by a business entity because public materials show multiple business roles.
- It is not publicly confirmed which exact legal entity, PG provider, bank account, or tax treatment was used for the specific bootcamp service that reportedly generated USD 35.91.
- If the service used a global payment provider such as Stripe, the operator would generally need an eligible legal/business setup in a Stripe-supported country. Stripe's official global availability page does not list South Korea as a fully supported direct account country as of this review.
- If the service used a domestic PG such as Toss Payments, live card payment normally depends on merchant onboarding and card-company review, not just code integration.

## Implications For Event Bingo
- Event Bingo does not need a company at MVP or free-beta stage.
- If Event Bingo later charges organizers, the first paid phase is more likely to be a B2B service arrangement: quote, service order/contract, event setup, operation support, result report, and tax invoice or account transfer.
- This is not a reason to add payment code now. It is a reason to keep event/report/admin boundaries clean so a future B2B operations layer can be added without rewriting gameplay.
- A Korean individual business registration may be enough for early B2B pilots if the customer accepts it, but a corporation may be easier for enterprise procurement, contracting, vendor registration, liability separation, and trust.
- A corporation should be considered when:
- Multiple contributors need clear ownership, equity, or revenue sharing.
- B2B contracts require a corporate counterparty.
- The project receives investment or grants that require corporate form.
- The service takes on material legal, privacy, financial, or operational risk.
- Enterprise customers ask for tax invoices, contracts, security review, and vendor registration.
- A B2B-first offering should define service packages before payment plumbing:
- Event setup and configuration support.
- Participant bingo experience operation.
- Admin/report dashboard access.
- Post-event analytics/report export.
- Optional custom branding or private event URL.
- Optional on-site/remote operation support.
- Optional AI-assisted keyword generation or moderation.
- For invoice/tax-invoice billing, the practical path is usually:
- Prepare a simple service description, pricing basis, and deliverables.
- Register an individual business or corporation before issuing tax invoices or signing formal paid contracts.
- Prepare quotation, order form or service agreement, business bank account, and customer/vendor registration information.
- Define supply timing, payment due date, cancellation/refund terms, and what happens if an event is postponed or canceled.
- Keep admin-side entitlement control manual at first: mark an event/customer as paid/active after contract or invoice confirmation.
- For Korean card/PG payment, the practical path is usually:
- Prepare real service URL, product/pricing page, terms, privacy policy, refund/cancellation policy, and seller/contact information.
- Register an individual business or corporation.
- Apply to a PG such as Toss Payments, PortOne-backed PGs, KG Inicis, Nice Payments, etc.
- Use test keys first, then switch to live keys after merchant/card review.
- Add server-side webhook verification and payment-state reconciliation before enabling paid access.
- For Event Bingo, PG/card payment should probably wait until there is a repeatable self-serve package. It is lower priority than B2B contract/invoice operations.
- For global payment, evaluate:
- Whether domestic PG overseas card support is enough.
- Whether the service truly needs Stripe-like global subscription tooling.
- Whether overseas incorporation is worth the cost and compliance overhead.

## Recommended Commercialization Sequence
- Phase 0: Free internal alpha
- Keep payment out of scope.
- Validate organizer workflow, participant flow, event analytics, and retention/privacy posture.
- Keep privacy policy and event participant notice accurate even without paid features.

- Phase 1: Free or invite-only pilot events
- Add operator-facing usage metrics and feedback collection.
- Clarify who the service is for: internal organizers, community events, external B2B event organizers, or public self-serve users. Current assumption: external B2B event organizers are the stronger fit.
- Use the existing event-manager request flow as a lightweight organizer-intake path.
- Improve the pilot handoff around what organizers receive after an event: dashboard screenshots, CSV exports, top keywords, bingo completion distribution, and interaction summary.
- Draft B2B pricing hypotheses only as notes; do not implement billing.
- Prepare only lightweight customer-facing surfaces: service overview, sample report, privacy policy, terms, support email, and basic security/privacy notes.

- Phase 2: Paid B2B pilot with manual billing
- Use quote/contract/account transfer/tax invoice flow before adding self-serve card payment.
- This matches service-provision sales better than PG checkout and reduces implementation risk while testing willingness to pay.
- Track what is being sold: event package, event creation quota, participant count tier, analytics/report export, branding removal, organizer seats, or operation-support hours.
- Backend can start with no billing module at all. If needed, use an admin-only note/status outside the participant gameplay path before adding durable billing concepts.

- Phase 3: B2B billing operations
- Do not start this phase until at least one repeatable paid service package is clear.
- Add internal records for customers, contracts/orders, invoices, event entitlements, and payment status even if actual tax invoices are issued outside the app.
- Keep the product system aligned with service delivery:
- Customer/account.
- Contact person and billing email.
- Contract/order reference.
- Event entitlement scope.
- Service period or event date.
- Invoice issued/paid status.
- Admin notes and audit trail.
- Required backend concepts before self-serve payment:
- `plans` or product catalog.
- `orders` / `payment_attempts`.
- `subscriptions` or `entitlements`.
- Invoice/payment status.
- Cancel/postpone/refund state handling.
- Admin override/audit trail.

- Phase 4: Optional self-serve payment
- Introduce a payment provider only after the monetized unit is stable and there is demand for low-touch self-serve purchase.
- Prefer domestic PG first if the initial customer base is Korean.
- Implement backend-owned payment state. Do not rely only on frontend success callbacks.
- Add webhook event log with idempotency if PG integration is introduced.

- Phase 5: Formal company / scale review
- Revisit legal entity, tax invoice, privacy/legal review, processor list, support SLA, monitoring, incident process, and data retention enforcement.
- Consider corporation only when commercial/legal pressure justifies it.

## Email / Notification Operations Note
- Current pilot path:
- Use `devfactory.ops@gmail.com` as the unified support, operations, reply-to, and SMTP sender address.
- Keep `From` and `Reply-To` separately configurable in application runtime settings so the sender can move to a verified domain later without code changes.
- Avoid relying on a personal email address for public-facing operations.

- Future external-pilot path:
- For broader pilots or repeated external events, move transactional email to a verified-domain provider such as Resend, Brevo, SendGrid, or Amazon SES.
- Domain-authenticated sending should include SPF, DKIM, DMARC, and return-path or bounce handling.
- Resend was evaluated as a lightweight future option for transactional sending.
- Resend inbound/receiving is not needed unless the service later needs a `support@...` mailbox, webhook-based inbound processing, or a dedicated support workflow.
- Keep marketing/bulk email separate from transactional messages such as admin approval, login, and event-operation notices.

## General Research Backlog
- Timing:
- Keep this as a parked research topic until after service P0/P1 and admin/report flows have been exercised with real or realistic events.
- Revisit when there is a real external organizer asking to pay, a repeated pilot pattern, or a clear need for vendor registration/tax invoice.

- B2B service model:
- What kinds of customers would buy this: company event teams, conference/community organizers, education programs, HR/engagement teams, or agencies?
- Is the paid value the tool itself, the event operation package, or the post-event analytics/report?
- What deliverables would a customer expect before paying: setup support, participant URL, admin access, live support, result report, data export, custom branding?
- What minimum service-level expectations are reasonable: support hours, incident response, backup event flow, data retention window?
- What should the organizer intake form capture later: organization, expected attendee count, event date, on-site/online format, reporting needs, privacy/security contact, and custom branding needs?

- Tax invoice / accounting path:
- Confirm with a tax professional which entity is appropriate before any paid B2B contract.
- Confirm whether the actual transaction is taxable service supply and what document is needed for the buyer: tax invoice, invoice, cash receipt, or another document.
- Verify current National Tax Service rules at the time of launch; electronic tax invoice thresholds and obligations can change.
- Determine whether early paid pilots can be handled through individual business registration or whether target customers require a corporation.
- Decide who owns billing operations: product owner, operating entity, accountant, or admin.

- Contract / procurement path:
- Prepare a lightweight service description and quotation template only when a real prospect appears.
- Identify whether customers need vendor registration, business registration certificate, bank account copy, privacy/security documentation, or a standard contract.
- Define cancellation/postponement terms for event-based service.
- Define whether custom work is included or billed separately.

- Product/billing architecture path:
- Defer PG and automated billing until there is demand for self-serve purchase.
- Before PG, consider simple admin-only fields: customer name, contract/order reference, service period/event date, billing status, entitlement status, and notes.
- Keep any billing data separate from gameplay and participant data.
- Design for manual override and audit trail before automating payment.

## Near-Term Product Fit Checklist
- Before revisiting B2B billing, the CTO/product owner should be able to answer:
- Can a non-developer organizer create or request an event without code changes?
- Can participants complete the login -> keyword selection -> bingo exchange flow on mobile without operator help?
- Does the admin dashboard show enough post-event value to justify a report?
- Are attendance, interaction, keyword, and bingo completion exports accurate enough for an organizer handoff?
- Is there a known operational owner for event setup, live support, and post-event report delivery?
- Are privacy policy, participant notice, retention behavior, and exported personal data handling acceptable for a real external event?
- Has issue #81 regression risk been checked around keyword exchange recorded but board not updated?

## Suggested Current-Scope Follow-Ups
- Keep all of these as product/backlog items, not immediate implementation unless explicitly prioritized:
- Improve the event-manager request form into a better pilot-intake form by adding organization, expected attendee count, event date, and notes if not already surfaced.
- Produce a sample post-event report from existing admin analytics and CSV exports.
- Compare the current admin analytics against the product requirement report outcomes: participant count, interaction graph, total bingo exchanges, and most selected keywords.
- Document a lightweight pilot-operation runbook: pre-event setup, live event check, fallback if login/exchange fails, post-event export/report steps.
- Validate mobile service flow and desktop admin flow before adding any commercial features.

## Technical Notes For Future Billing / Payment Implementation
- For the likely B2B path, prioritize service-delivery billing primitives before PG integration:
- Customer/company profile.
- Contact and billing information.
- Event-level entitlement and service scope.
- Contract/order reference fields.
- Invoice issued/paid/canceled status.
- Manual admin status changes with audit trail.
- Exportable internal records for accountant/tax-invoice workflows.
- Keep any later payment integration behind backend APIs:
- Frontend creates a checkout request.
- Backend creates/verifies order state.
- PG redirects or widget completes payment.
- Backend receives webhook and verifies signature.
- Backend marks entitlement active only after confirmed payment.
- Use idempotency keys and immutable payment event logs.
- Treat failed, pending, canceled, refunded, and partially refunded states explicitly.
- Billing/payment should not be entangled with bingo gameplay state. Prefer a separate customer/billing module/domain.
- Avoid storing raw card data. Use PG-hosted widgets/checkout and provider tokens.
- Add E2E tests for success, cancel, failed webhook, duplicate webhook, and refund/admin override flows.
- For B2B manual billing, add tests for entitlement activation/deactivation, event limit enforcement, report access, and admin audit records.

## Product Questions For CTO / Product Owner
- Who pays: event organizer, sponsor, company department, community operator, or internal admin?
- What is the paid unit: one-off event package, participant count tier, monthly organizer subscription, report export, custom branding, operation support, or AI keyword generation?
- Is the first paid customer expected to be a Korean B2B customer?
- Does the service need self-serve payment at all, or are quote/contract/tax-invoice workflows enough for the foreseeable roadmap?
- Who issues invoices/tax invoices, and under what entity: individual business, corporation, or another operating organization?
- What customer documents are needed: quotation, service agreement, privacy/security note, statement of work, sample report, vendor registration docs?
- Are reports/analytics valuable enough to place behind a paid tier?
- What cancellation/postponement/refund promise should be made for event-based B2B billing?
- Should billing be discussed only after admin/report features reach P1 stability? Current recommendation: yes.

## Risks
- Known risks:
- Billing/commercial features create cross-domain impact: backend, frontend, privacy/legal, operations, and possibly infra.
- B2B customers may require contracts, security questionnaires, tax invoices, vendor registration, and clear support ownership before paying.
- Domestic PG live approval may require a complete public site, policy pages, seller information, and reviewable product descriptions.
- Global payment options can add legal-entity complexity if Stripe or similar providers are required.
- Privacy/compliance risk increases once customer accounts, invoices, paid entitlements, or business contact data are stored.
- AI-generated service features may create separate cost-control and abuse-prevention requirements if tied to payment.
- Follow-up needed:
- Keep monetization as a future option unless product owner explicitly prioritizes a paid pilot.
- If near-term paid pilot appears, open a separate product-owner scope task for B2B service packaging before implementation.
- Confirm legal/tax path with a qualified professional before issuing invoices, tax invoices, or taking real payments.

## Suggested Next Owner
- Owner: product-owner / CTO
- Expected next action:
- Keep Event Bingo free/invite-only through the next milestone unless a concrete paid pilot emerges.
- Focus next on service-page reliability, admin/report usefulness, privacy readiness, and pilot operations.
- If paid pilot is desired later, define service package, buyer, deliverables, cancellation terms, and manual entitlement workflow before selecting or implementing any PG.
