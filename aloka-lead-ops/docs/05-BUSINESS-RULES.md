# Business rules

## Lead identity and intake

- Normalize phone numbers to E.164.
- One lead exists per phone and project.
- Source/event IDs are stable across retries.
- Repeat intake must not overwrite original consent, source or ownership.
- If no active salesperson has capacity, retain the lead in an explicit unassigned queue.

## Ownership

- Sales users may access only their assigned leads.
- Only managers and admins may assign or reassign.
- Inactive staff are excluded from automatic assignment.

## Communication

- Never address a person as Client, Buyer, Customer or Lead. Use their valid name or `Sir/Madam`.
- WhatsApp replies should be at most 45–50 words, use single-asterisk bold and ask one question.
- Manual quick-send uses only server-owned approved templates.
- Messaging requires explicit WhatsApp consent and no opt-out.
- Any incoming reply pauses automated nurture.
- STOP, UNSUBSCRIBE or CANCEL permanently suppresses pending outreach until reviewed re-consent exists.
- Automated outreach runs only 09:00–21:00 IST with configured jitter and limits.
- An uncertain provider result must be reconciled before retry.

## Site visits

Allowed meeting points are Hope Farm, Kadugodi Metro Station, Hoskote Toll Gate, Chikka Tirupathi Temple, Sarjapur Police Station, Corporate Office in Kammasandra, or self-drive. Doorstep pickup is not offered.

## Audit

Assignments, stage changes, activities, follow-ups, visit changes and messages create append-only events. Audit records are not ordinary editable business data.

## Marketing positioning

Project campaigns lead with location, price/value, convenience, amenities or growth-corridor benefits. Legal clarity reinforces the proposition; it is not the sole top-of-funnel hook.
