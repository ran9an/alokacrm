import { createHash } from "node:crypto";
import type pg from "pg";
import type { Intake } from "../../../packages/contracts/src/index.js";
import { tx, event } from "./db.js";
export async function assign(c: pg.PoolClient, leadId: string) {
  await c.query("SELECT pg_advisory_xact_lock(11001)");
  const { rows } = await c.query(
    `SELECT s.id FROM staff s LEFT JOIN leads l ON l.owner_id=s.id AND l.stage NOT IN ('lost','registered') WHERE s.active AND s.role='sales' GROUP BY s.id HAVING count(l.id)<s.capacity ORDER BY count(l.id)::float/s.capacity,s.last_assigned_at NULLS FIRST,s.id LIMIT 1`,
  );
  if (!rows[0]) return null;
  await c.query("UPDATE leads SET owner_id=$1,updated_at=now() WHERE id=$2", [
    rows[0].id,
    leadId,
  ]);
  await c.query("UPDATE staff SET last_assigned_at=now() WHERE id=$1", [
    rows[0].id,
  ]);
  await event(c, leadId, "lead.assigned", "assignment-engine", {
    ownerId: rows[0].id,
  });
  return rows[0].id;
}
export async function intake(input: Intake, actor: string) {
  return tx(async (c) => {
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      input.source + ":" + input.eventId,
    ]);
    const receipt = await c.query(
      "SELECT * FROM intake_receipts WHERE source=$1 AND event_id=$2",
      [input.source, input.eventId],
    );
    if (receipt.rows[0]) {
      if (receipt.rows[0].payload_hash !== hash)
        throw Object.assign(new Error("Idempotency conflict"), {
          statusCode: 409,
        });
      return { id: receipt.rows[0].lead_id, duplicate: true };
    }
    const inserted = await c.query(
      `INSERT INTO leads(phone,name,project_id,source,whatsapp_consent,consent_evidence,attribution) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(phone,project_id) DO NOTHING RETURNING id`,
      [
        input.phone,
        input.name,
        input.project,
        input.source,
        input.consent.whatsapp,
        input.consent.evidence,
        input.attribution,
      ],
    );
    const fresh = !!inserted.rows[0];
    const id = fresh
      ? inserted.rows[0].id
      : (
          await c.query(
            "SELECT id FROM leads WHERE phone=$1 AND project_id=$2",
            [input.phone, input.project],
          )
        ).rows[0].id;
    await c.query(
      "INSERT INTO intake_receipts(source,event_id,payload_hash,lead_id) VALUES($1,$2,$3,$4)",
      [input.source, input.eventId, hash, id],
    );
    await event(c, id, fresh ? "lead.created" : "lead.source_seen", actor, {
      source: input.source,
      attribution: input.attribution,
    });
    if (fresh) {
      await assign(c, id);
      if (input.consent.whatsapp)
        await c.query(
          `INSERT INTO followups(lead_id,dedupe_key,due_at,body) VALUES($1,$2,now(),$3)`,
          [
            id,
            "welcome:" + id,
            "Thank you for contacting Aloka Developers. How can we help with your land search? Reply STOP to opt out.",
          ],
        );
    }
    return { id, duplicate: !fresh };
  });
}
