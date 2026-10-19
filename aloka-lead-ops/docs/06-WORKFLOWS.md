# Operational workflows

## Lead intake

```text
Source adapter -> authenticated intake -> validate and normalize
 -> deduplicate source event -> find/create lead -> assign active sales owner
 -> append audit event -> queue reporting projection
```

Customer-initiated Meta Leads Sheet logging remains owned by the production n8n workflow and must preserve the repository-level first-message and phone-resolution invariants.

## Presales workflow

```text
Open assigned lead -> record call/note/task -> update qualification/stage
 -> schedule one next action -> schedule site visit when ready
```

## Site visit

Schedule with an approved hub or self-drive, assign an executive, then mark completed, cancelled or rescheduled. Completion can record feedback and plots shown and advances the lead to `visited`.

## WhatsApp quick-send

The user selects an approved action. The API authenticates, authorizes ownership, checks consent and opt-out, checks that messaging is enabled, stores `sending`, invokes OpenWA, then records `sent` or `uncertain` and appends an event.

## Incoming WhatsApp reply

The authenticated OpenWA callback deduplicates by provider event ID, appends the incoming message event, pauses nurture, and applies opt-out when the exact stop phrases match.

## Reporting

Domain events create integration jobs transactionally. n8n exports stable UUID-based rows to Sheets. A reporting failure must never roll back intake or block messaging UI.
