# WhatsApp integration

## Provider boundary

`MessagingProvider` isolates CRM domain logic from OpenWA. The configured production endpoint must be the stable OpenWA VPS; temporary tunnels are prohibited. Credentials stay server-side.

## Outbound

Set `MESSAGING_ENABLED=true` only after a staff-owned test, callback verification and reconciliation drill. The provider converts E.164 to canonical `91xxxxxxxxxx@c.us`; `@lid` is never a primary contact key.

Manual quick-send is limited to four server-owned actions. Automated sends additionally respect consent, opt-out, reply pause, closed stages, IST business hours, the sender lock and configured rate controls.

## Inbound

Native OpenWA payloads must be normalized before `/v1/webhooks/openwa`. Adapters must ignore groups/self messages, preserve provider message IDs, resolve a genuine phone JID, and authenticate with `OPENWA_WEBHOOK_TOKEN`.

## Delivery states

- `sending`: attempt started.
- `sent`: provider returned a recognized message ID.
- `uncertain`: transport failed after delivery may have occurred; review provider history before retry.
- `failed`: definite rejection safe for reviewed handling.

Local throttles reduce risk but do not guarantee Meta eligibility or prevent account action.
