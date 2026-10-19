# Aloka CRM — Product Requirements Document

**Product:** Aloka CRM

**Organization:** Aloka Developers

**Status:** Active product specification

**Version:** 1.0

**Last updated:** 20 October 2026

**Initial project:** Aloka Green County

## 1. Purpose

Aloka CRM is the private operating system for Aloka Developers' customer relationships. It must provide one authoritative place to capture every genuine enquiry, assign responsibility, track every customer interaction, manage follow-ups and site visits, and monitor outcomes from first contact through booking, registration, loss, or opt-out.

The product launches with Aloka Green County and must support future Aloka projects without duplicating infrastructure or mixing project-specific data.

This document is the product-level source of truth for work inside `07_CRM`. Detailed architecture, API, security, UI, and testing documents may refine implementation, but must not contradict this PRD or the workspace-level `AGENTS.md` invariants.

## 2. Authoritative project facts

- Aloka Green County is located at **Arasanahalli, STRR-Whitefield Exit, Devanagonthi, East Bengaluru**.
- The Satellite Town Ring Road (**STRR**) is **just 2 km from Aloka Green County**.
- All customer communication, CRM data, campaigns, templates, and generated material must use these facts consistently.

## 3. Product vision

Give every authorized Aloka team member a reliable, role-appropriate view of each customer relationship while ensuring that:

- no genuine enquiry is lost;
- no customer receives unsafe or duplicate outreach;
- all communication is attributable and auditable;
- every lead has a clear owner and next action;
- managers can identify delays and operational risks quickly;
- project performance can be measured from source to outcome; and
- new projects can be introduced through configuration rather than a new CRM build.

## 4. Product principles

1. **PostgreSQL is authoritative.** Sheets are projections and operational exports, never the master record.
2. **Communication is immutable history.** Message records and audit events are appended, not silently rewritten.
3. **People are identified by genuine phone numbers.** WhatsApp `@lid` identifiers must never become primary contact keys.
4. **Project context is explicit.** A contact may have separate opportunities for multiple projects while retaining a unified identity.
5. **Safety is enforced in code.** Consent, suppression, operating hours, follow-up limits, and human takeover cannot depend only on prompts.
6. **Human ownership is visible.** Every active opportunity has an owner or appears in an explicit unassigned queue.
7. **No invented success.** The UI must distinguish queued, sent, delivered, read, failed, and uncertain communication states.
8. **Minimum necessary access.** Staff see only the customer and project data required for their role.

## 5. Goals

### 5.1 Business goals

- Establish one complete customer and communication record across WhatsApp, campaigns, calls, notes, follow-ups, and site visits.
- Reduce response delays, forgotten follow-ups, duplicate contact, and unclear ownership.
- Improve qualified site-visit conversion for Aloka Green County.
- Give managers trustworthy funnel, workload, response-time, and source-performance visibility.
- Provide a reusable operating model for future Aloka projects.

### 5.2 User goals

- Sales staff can see whom to contact, why, and what happened previously.
- Managers can assign work and resolve operational exceptions without inspecting spreadsheets or n8n executions.
- Administrators can configure staff, projects, sources, templates, and integrations safely.
- Leadership can view reliable outcome reporting without accessing individual operational tools.

### 5.3 Success measures

Initial production targets will be baselined during the controlled rollout. The CRM must measure:

- percentage of valid enquiries successfully recorded;
- median and 90th-percentile first-response time;
- percentage of active leads with an owner and next action;
- overdue follow-up count and age;
- enquiry-to-qualified, qualified-to-visit, and visit-to-booking conversion;
- scheduled, completed, cancelled, and no-show site visits;
- leads and conversions by project, campaign, source, and salesperson;
- delivery failure and uncertain-delivery rates;
- opt-out compliance and blocked-send attempts; and
- integration queue age, retry count, and terminal failures.

## 6. Users and permissions

| Role | Primary responsibilities | Access boundary |
| --- | --- | --- |
| Administrator | Staff, roles, projects, configuration, integrations, audit and incident response | All operational data and configuration |
| Manager | Assignment, team monitoring, pipeline, visits, follow-ups and reporting | Authorized projects and teams |
| Sales | Work assigned enquiries, communicate, qualify, schedule visits and record outcomes | Assigned opportunities only unless explicitly expanded |
| Viewer | Leadership reporting and read-only review | Authorized dashboards and records; no mutations |
| Service identity | n8n, OpenWA callbacks, imports and reporting jobs | Narrow endpoint-specific tokens only |

Public signup is prohibited. Every staff account must map to an active `staff` record with an auditable role and project scope.

## 7. Scope

### 7.1 Production Release 1 scope

- Staff authentication and role-based authorization
- Staff activation, capacity, project access, and assignment administration
- Contact identity and multi-project opportunities
- Lead intake from Meta, WhatsApp, web/portal adapters, manual entry, and approved imports
- Deterministic deduplication and source attribution
- Unified WhatsApp conversation history
- Manual approved replies and controlled automated follow-up
- Lead pipeline, qualification, notes, calls, tasks, and next actions
- Site-visit scheduling, alerts, reminders, attendance, feedback, and outcomes
- Manager dashboards and operational queues
- Opt-out, disinterest, mismatch, suppression, and blacklist enforcement
- Reporting integrations and durable job processing
- Append-only audit history
- Production deployment, monitoring, backups, and restore verification

### 7.2 Deferred scope

- Plot inventory and transactional holds
- Quotations and negotiated price approval
- Booking commerce and payment schedules
- Receipts, collections, commissions, and accounting
- Registration workflow automation
- Native voice calling or call recording
- Bulk promotional broadcasting

Deferred modules must not appear as functional UI. They may be visibly marked as unavailable only when this helps navigation clarity.

## 8. Core domain model

### 8.1 Contact

A person identified by normalized phone number, with optional verified name and contact preferences. A contact may have opportunities across multiple projects.

### 8.2 Project

A configurable Aloka development with its own location, status, messaging facts, qualification schema, pickup hubs, templates, staff access, sources, and reporting dimensions.

### 8.3 Opportunity

The relationship between one contact and one project. It contains stage, source, consent, owner, qualification, next action, loss status, and lifecycle timestamps. The unique business key is normalized phone plus project.

### 8.4 Conversation and message

A conversation groups communication with a contact on a channel. Each message records direction, sender, timestamp, provider identity, content metadata, delivery state, automation origin, and reply context.

### 8.5 Activity

A staff-created call record, note, task, or operational event connected to an opportunity.

### 8.6 Follow-up

A scheduled next action with an owner, due time, status, outcome, idempotency key, and safety eligibility state.

### 8.7 Site visit

A project visit with date, meeting point, attendees, assigned staff, transport mode, reminders, attendance, feedback, and outcome.

### 8.8 Audit event

An append-only record of a material state transition, actor, time, request context, and safe before/after metadata.

## 9. Functional requirements

### 9.1 Authentication and staff administration

- **AUTH-01:** Staff authenticate with individual CRM credentials. Passwords use salted scrypt hashes; the API issues revocable 12-hour opaque sessions and stores only token hashes. Supabase JWT verification remains an optional migration-compatible path.
- **AUTH-02:** Authorization comes from the database, not user-editable token metadata.
- **AUTH-03:** Administrators can activate/deactivate staff, assign roles, configure capacity, and grant project access.
- **AUTH-04:** Role, capacity, activation, and project-access changes generate audit events.
- **AUTH-05:** Deactivated users lose access immediately and are excluded from automatic assignment.

### 9.2 Project administration

- **PROJ-01:** Administrators can create, edit, activate, and archive projects without deleting historical records.
- **PROJ-02:** Each project supports canonical name, slug, location, status, facts, pickup hubs, qualification form, templates, and team access.
- **PROJ-03:** Project-specific facts used in messages must come from controlled configuration or approved templates.
- **PROJ-04:** Adding a future project must not require schema duplication or a separate deployment.

### 9.3 Intake and identity

- **INT-01:** Intake accepts normalized events from authorized sources and requires stable source and event identifiers.
- **INT-02:** Replayed source events are idempotent and must not create duplicate opportunities or overwrite original attribution and consent.
- **INT-03:** Phone numbers are normalized to E.164; invalid or unresolved `@lid`-only identities are quarantined for resolution.
- **INT-04:** One opportunity exists per normalized phone and project.
- **INT-05:** Customer-initiated WhatsApp enquiries are distinguished from Aloka-initiated outreach using OpenWA message history.
- **INT-06:** Only customer-initiated first contacts qualify for the protected Meta Leads sheet sync.
- **INT-07:** Unassignable enquiries remain visible in an explicit unassigned queue.
- **INT-08:** Manual creation and imports require source, project, consent provenance, and deduplication checks.

### 9.4 Assignment and pipeline

- **PIPE-01:** Automatic assignment is deterministic, capacity-aware, and restricted to active eligible staff.
- **PIPE-02:** Managers and administrators can assign or reassign opportunities with an audit reason.
- **PIPE-03:** Sales staff access only assigned opportunities unless a manager-authorized policy says otherwise.
- **PIPE-04:** Supported stages are `new`, `contacted`, `qualified`, `visit_scheduled`, `visited`, `negotiation`, `booked`, `registered`, and `lost`.
- **PIPE-05:** Stage transitions record actor, timestamp, and reason where required.
- **PIPE-06:** Lost opportunities require a controlled reason, including not interested, location mismatch, budget mismatch, bought elsewhere, unreachable, duplicate, or other with a note.
- **PIPE-07:** Every active opportunity displays an owner and next action or an explicit exception state.

### 9.5 Unified communication ledger

- **COM-01:** Every supported incoming and outgoing WhatsApp message is written to PostgreSQL.
- **COM-02:** Messages record contact, opportunity/project context, direction, provider IDs, genuine phone JID, sender, timestamps, type, safe content or attachment metadata, and status.
- **COM-03:** Delivery progression supports `queued`, `sending`, `sent`, `delivered`, `read`, `failed`, and `uncertain` without falsely promoting ambiguous results.
- **COM-04:** Provider webhooks and receipts are idempotent.
- **COM-05:** Messages identify whether they were human-written, approved-template, rule-based automation, or AI-assisted.
- **COM-06:** Incoming replies pause automated nurture immediately.
- **COM-07:** The conversation timeline combines messages, calls, notes, tasks, ownership changes, stage changes, follow-ups, visits, and suppression events chronologically.
- **COM-08:** Staff can use approved quick actions for brochures, site-visit confirmation, location sharing, and callback requests.
- **COM-09:** Free-form or AI-assisted send capability, if enabled, must pass authorization, consent, suppression, content, and destination checks on the server.
- **COM-10:** Customers are addressed by a valid name or `Sir/Madam`, never as Client, Buyer, Customer, or Lead.

### 9.6 Follow-ups and messaging safety

- **SAFE-01:** No bulk-blast feature is permitted.
- **SAFE-02:** Automated processing is capped at 5–10 eligible opportunities per execution.
- **SAFE-03:** A lead may receive only one automated follow-up unless a future policy is explicitly approved and versioned.
- **SAFE-04:** Automated follow-up is blocked when the customer interacted within the previous 48 hours.
- **SAFE-05:** Automated sends occur only from 09:00 to 21:00 IST.
- **SAFE-06:** Dispatches use configurable human-like random jitter, with a default range of 90–180 seconds.
- **SAFE-07:** STOP, UNSUBSCRIBE, CANCEL, disinterest, bought elsewhere, location mismatch, and budget mismatch trigger the appropriate acknowledgement, classification, suppression, and cancellation behavior.
- **SAFE-08:** The worker checks consent, blacklist, opt-out, reply pause, send window, prior follow-up, and destination immediately before dispatch.
- **SAFE-09:** An uncertain provider result is reconciled before retry; the system must not blindly resend.
- **SAFE-10:** All blocked-send decisions remain visible for audit and operations.

### 9.7 Site visits

- **VISIT-01:** Authorized staff can schedule, reschedule, cancel, complete, or mark a site visit as a no-show.
- **VISIT-02:** Allowed complimentary pickup hubs are Hope Farm, Kadugodi Metro Station, Hoskote Toll Gate, Chikka Tirupathi Temple, Sarjapur Police Station, and the Corporate Office in Kammasandra.
- **VISIT-03:** Self-drive is allowed; doorstep pickup must never be offered.
- **VISIT-04:** Confirmations and material changes notify the configured internal recipients and customer through approved channels.
- **VISIT-05:** Visits record assigned staff, meeting point, transport mode, attendee count, reminders, feedback, and next outcome.
- **VISIT-06:** Site visits continue to synchronize safely with the `Site Visit - By AI` reporting tab where required.

### 9.8 Operational interface

- **UI-01:** The product provides Dashboard, Inbox, Leads, Follow-ups, Site Visits, Reports, and Administration areas appropriate to role.
- **UI-02:** The Inbox supports conversation search, unread state, assignment, project context, reply, and human takeover.
- **UI-03:** Lead detail shows identity, source, owner, stage, qualification, next action, conversation, activities, visits, documents, and audit history.
- **UI-04:** Dedicated follow-up and visit queues support filtering, sorting, ownership, project, due state, and cursor pagination.
- **UI-05:** Manager dashboards use server-computed aggregates rather than client-side totals.
- **UI-06:** Every data surface includes loading, empty, error, and permission-denied states.
- **UI-07:** Material and destructive actions require confirmation and produce clear outcomes.
- **UI-08:** The interface is desktop-first, responsive, keyboard accessible, and follows `DESIGN.md`.

### 9.9 Reporting and integrations

- **REP-01:** Managers can filter reporting by date, project, campaign/source, salesperson, stage, visit outcome, and lost reason.
- **REP-02:** Google Sheets exports use durable integration jobs and cannot block intake or customer-facing replies.
- **REP-03:** Integration jobs support retry policy, exponential backoff, terminal failure, manual replay, and observability.
- **REP-04:** The protected Meta Leads sync performs multi-format phone deduplication and never modifies the `Remark` column.
- **REP-05:** Existing Premashis/Anupriya logging and required operational reports remain intact until formally replaced and reconciled.
- **REP-06:** Meta and GA4 adapters record delivery results; queued intent must not be presented as completed export.

### 9.10 Documents

- **DOC-01:** Authorized staff can upload and download documents through private object storage using short-lived signed URLs.
- **DOC-02:** Document metadata records type, owner, access class, uploader, verification state, checksum, and timestamps.
- **DOC-03:** KYC and sensitive documents require stricter authorization and must not use public URLs.
- **DOC-04:** Access, verification changes, and deletion/retention actions are audited.

### 9.11 Audit and administration

- **AUD-01:** Assignments, stage changes, qualification changes, activities, follow-ups, visits, messages, consent, suppression, staff configuration, and project configuration generate append-only audit events.
- **AUD-02:** Audit events cannot be edited or deleted through ordinary application paths.
- **AUD-03:** Administrators can inspect integration health, queue delay, failed jobs, uncertain messages, and unassigned opportunities.
- **AUD-04:** Logs use request IDs and redact authorization headers, cookies, secrets, and unnecessary personal data.

## 10. Primary workflows

### 10.1 Customer-initiated WhatsApp enquiry

1. OpenWA delivers the event to the protected webhook.
2. The system resolves a genuine phone number and canonical `@c.us` JID.
3. The event is persisted idempotently.
4. Chat history determines whether the customer initiated the conversation.
5. The contact and project opportunity are created or matched.
6. Eligible customer-initiated first contacts are synchronized to Meta Leads without touching `Remark`.
7. The opportunity is assigned or placed in the unassigned queue.
8. The inbound message appears in the Inbox and unified timeline.
9. Applicable automation or a staff member replies under messaging rules.
10. Receipt updates are reconciled without duplicate sends.

### 10.2 Outbound-created portal enquiry

1. An authorized adapter submits the portal event with project and provenance.
2. The opportunity is deduplicated and assigned.
3. It is marked as outreach-originated and must not be appended to Meta Leads.
4. Consent and approved-process checks govern any outbound message.
5. A customer reply pauses nurture and becomes part of the unified conversation.

### 10.3 Qualification to site visit

1. Sales reviews history and records qualification one question at a time.
2. The opportunity advances only when required data is present.
3. A visit is scheduled using an approved pickup hub or self-drive.
4. The customer and internal stakeholders receive approved confirmation.
5. Reminders and changes are recorded and safely dispatched.
6. Attendance, feedback, outcome, and next action are recorded after the visit.

### 10.4 Opt-out or mismatch

1. The incoming message is recorded.
2. Intent is detected or manually classified.
3. A brief respectful acknowledgement is sent when appropriate.
4. The opportunity is classified with the correct reason.
5. The contact/opportunity is suppressed and added to the blacklist policy scope.
6. Pending automated sends are cancelled.
7. Future workers re-check suppression before every send.

## 11. Non-functional requirements

### 11.1 Security and privacy

- TLS is mandatory in production; the database and internal services remain private.
- Production secrets are long, random, environment-specific, and stored outside Git.
- Database roles follow least privilege; browser access to tables remains denied.
- Sensitive personal data has a documented retention and deletion policy.
- Security-relevant actions and authentication failures are monitored.
- Dependencies and container images are scanned during CI or deployment.

### 11.2 Reliability

- Intake and provider callbacks are idempotent.
- Customer-facing intake continues when Sheets or analytics services fail.
- Durable queues survive API and worker restarts.
- Database backups are automated, encrypted, retained, and restoration-tested.
- Health checks cover API process, database connectivity, and queue health separately.

### 11.3 Performance

- Normal authenticated read requests should target a 95th-percentile response below 500 ms, excluding external providers.
- The primary Inbox and lead lists must use indexed cursor pagination before production scale-up.
- Dashboard aggregates are computed server-side and may use controlled caching.
- Slow queries and integration queue delays are observable.

### 11.4 Accessibility and usability

- Keyboard focus is visible and core workflows are keyboard-operable.
- Text and controls meet WCAG 2.1 AA contrast targets.
- Status is not communicated by color alone.
- Tables remain understandable on small screens through responsive prioritization.
- Times display clearly in IST while stored canonically.

### 11.5 Maintainability

- TypeScript strictness, shared validation, forward-only migrations, automated tests, and CI gates are required.
- External providers remain behind adapters.
- Applied migrations are never edited; new numbered migrations carry changes forward.
- Configuration should replace project-specific branching wherever practical.

## 12. Data migration requirements

The controlled migration must inventory and reconcile:

- Meta Leads;
- Premashis and Anupriya tracking tabs;
- `Site Visit - By AI` records;
- other approved trackers or CRM exports;
- available WhatsApp contact and message history;
- staff ownership and capacity;
- opt-outs, disinterest, and mismatch records; and
- campaign/source identifiers.

Every import must support dry-run validation, row-level error reporting, phone normalization, project mapping, deterministic deduplication, provenance, repeatable execution, and reconciliation totals. Imports must not silently overwrite original attribution, consent, ownership history, or timestamps.

## 13. Delivery plan

### Phase 0 — Discovery and production design

- Confirm staff roles, project configuration, lead sources, existing data, and reporting needs.
- Capture sanitized real OpenWA and portal payload samples.
- Define production/staging topology, domains, secrets, backup targets, and ownership.
- Record baseline operational metrics and approve the Release 1 boundary.

**Exit gate:** Architecture and data-migration plan approved; required access and test fixtures available.

### Phase 1 — Production foundation

- Provision staging and production PostgreSQL, CRM authentication, API, web, worker, TLS, logs, metrics, and backups.
- Complete staff/project administration and project-scoped authorization.
- Add production CI/CD and migration controls.

**Exit gate:** Auth, RBAC, deployment, backup, and restore checks pass in staging.

### Phase 2 — Communication ledger and Inbox

- Implement contacts, conversations, inbound/outbound messages, receipts, attachments metadata, and provider reconciliation.
- Integrate OpenWA through authenticated webhooks and the messaging worker.
- Build Inbox and unified timeline with human takeover.

**Exit gate:** A staged conversation round-trip records incoming, outgoing, delivery, read/failure, and audit states without duplication.

### Phase 3 — Lead operations

- Complete multi-source intake, assignment administration, pipeline, qualification, activities, next actions, follow-up queue, and suppression.
- Preserve the customer-initiated Meta Leads invariant and existing operational exports.

**Exit gate:** End-to-end enquiry, assignment, qualification, follow-up, opt-out, and manager exception workflows pass.

### Phase 4 — Site visits and reporting

- Build the visit desk, reminders, internal notifications, attendance, feedback, and outcomes.
- Complete manager dashboards, source attribution, conversion reporting, and durable integrations.

**Exit gate:** Green County enquiry-to-visit flow and reporting reconciliation pass with test contacts.

### Phase 5 — Migration and controlled rollout

- Dry-run, reconcile, and import approved historical data.
- Pilot with one administrator, one manager, and one salesperson.
- Roll out Green County intake, then the remaining team.
- Monitor response times, failures, uncertain sends, queue delay, and adoption.

**Exit gate:** Production acceptance is signed off and rollback/incident procedures are proven.

### Phase 6 — Future projects and controlled expansion

- Add future projects through administration.
- Validate project isolation, templates, access, source mapping, and reporting.
- Prioritize deferred modules only after operational adoption and data quality are stable.

## 14. Release 1 acceptance criteria

Release 1 is production-ready only when:

- authenticated users are authorized by active database membership;
- sales users cannot access another salesperson's opportunities without permission;
- every supported enquiry is recorded exactly once despite retries;
- customer-initiated and outreach-originated contacts are distinguished correctly;
- every supported WhatsApp message and receipt appears in the correct timeline;
- no `@lid` value is stored or sent as the primary customer phone identity;
- unsafe, suppressed, outside-hours, duplicate, or ineligible automated sends are blocked;
- uncertain sends are reconciled before retry;
- assignments, pipeline changes, follow-ups, visits, and suppression are auditable;
- Sheets and analytics failures do not block intake or replies;
- manager counts reconcile with database records;
- a backup can be restored successfully;
- `npm run typecheck`, `npm test`, and `npm run build` pass;
- real PostgreSQL concurrency and worker-restart tests pass in staging; and
- the complete Green County enquiry-to-site-visit journey passes on desktop and mobile layouts.

## 15. Required inputs from Aloka

- Production and staging hosting decision, domain access, and deployment ownership
- Production identity policy and approval for CRM-managed staff credentials
- n8n access and timestamped exports of active workflows
- OpenWA API documentation plus sanitized inbound, outbound, receipt, media, and history samples
- Google service account and approved spreadsheet/tab inventory
- Meta lead-source, campaign, ad set, and event details
- Current staff names, roles, project access, assignment capacity, and escalation contacts
- Approved WhatsApp templates and business consent policy
- Existing lead, follow-up, visit, blacklist, and ownership exports
- Green County qualification questions, controlled lost reasons, and approved project facts
- Data retention, document-access, and incident-notification decisions

Production secrets must be supplied through approved secret storage and must never be pasted into this document or committed to Git.

## 16. Open product decisions

These decisions must be resolved during Phase 0:

1. Hosting model and responsible production operator
2. Production password rotation, reset, and administrator recovery policy
3. Retention period for WhatsApp content, attachments, and attribution data
4. Whether managers can view all projects or only assigned project groups
5. Rules for shared contacts with opportunities across multiple projects
6. Whether free-form WhatsApp replies are permitted at launch or only approved quick actions
7. Exact qualification fields and stage-entry requirements for Green County
8. Definition and approval process for re-consent after suppression
9. Required internal notification recipients by project and visit event
10. Historical WhatsApp import depth supported by the current OpenWA session

## 17. Change control

- Material scope or policy changes require an update to this PRD before implementation.
- Database changes use new forward-only migrations.
- Production n8n changes require backup, branch audit, testing, publication, and repository synchronization.
- Messaging-safety requirements cannot be weakened without explicit written approval and a documented risk review.
- New projects must supply approved project facts and configuration before activation.

## 18. Immediate next action

Begin **Phase 0 — Discovery and production design** by producing:

1. a current-system integration inventory;
2. a sanitized OpenWA payload fixture set;
3. a production and staging deployment decision record;
4. a legacy-data migration inventory;
5. a confirmed staff/roles/capacity matrix; and
6. an approved Green County qualification and lifecycle schema.

Implementation should then begin with **Phase 1 — Production foundation**, followed immediately by **Phase 2 — Communication ledger and Inbox**. This order makes the CRM trustworthy before additional automation or reporting is added.
