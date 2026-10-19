import { tx, event, pool } from "./db.js";
import { messaging } from "./messaging.js";
import { sendWindow } from "../../../packages/contracts/src/index.js";
export async function tick() {
  if (
    process.env.MESSAGING_ENABLED !== "true" ||
    !sendWindow(
      new Date(),
      Number(process.env.SEND_START_HOUR_IST || 9),
      Number(process.env.SEND_END_HOUR_IST || 19),
    )
  )
    return;
  // Session lock serializes every sender across replicas, including the network call.
  const lock = await pool.connect();
  try {
    if (
      !(await lock.query("SELECT pg_try_advisory_lock(22002) AS ok")).rows[0].ok
    )
      return;
    await lock.query(
      "UPDATE followups SET state='uncertain',error='Stale send; reconcile provider delivery' WHERE state='sending' AND attempted_at<now()-interval '5 minutes'",
    );
    const row = await tx(async (c) => {
      const usage = await c.query(
        `SELECT count(*) FILTER(WHERE created_at>date_trunc('day',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS daily, max(created_at) AS last FROM events WHERE type='message.attempted'`,
      );
      if (
        Number(usage.rows[0].daily) >=
          Number(process.env.SEND_DAILY_LIMIT || 100) ||
        (usage.rows[0].last &&
          Date.now() - new Date(usage.rows[0].last).getTime() <
            Number(process.env.SEND_MIN_INTERVAL_SECONDS || 120) * 1000)
      )
        return;
      const { rows } = await c.query(
        `SELECT f.*,l.phone,l.whatsapp_consent,l.opted_out,l.stage,l.nurture_paused FROM followups f JOIN leads l ON l.id=f.lead_id WHERE f.state='pending' AND f.due_at<=now() AND NOT l.nurture_paused ORDER BY f.due_at FOR UPDATE OF f,l SKIP LOCKED LIMIT 1`,
      );
      const r = rows[0];
      if (!r) return;
      if (
        !r.whatsapp_consent ||
        r.opted_out ||
        ["lost", "registered", "booked"].includes(r.stage)
      ) {
        await c.query("UPDATE followups SET state='cancelled' WHERE id=$1", [
          r.id,
        ]);
        return;
      }
      await c.query(
        "UPDATE followups SET state='sending',attempts=attempts+1,attempted_at=now() WHERE id=$1",
        [r.id],
      );
      await event(c, r.lead_id, "message.attempted", "worker", {
        followupId: r.id,
      });
      return r;
    });
    if (!row) return;
    // Hold lead lock through send so STOP/stage mutations serialize with this decision.
    await tx(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM leads WHERE id=$1 FOR UPDATE",
        [row.lead_id],
      );
      const l = rows[0];
      if (
        l.nurture_paused ||
        l.opted_out ||
        !l.whatsapp_consent ||
        ["lost", "registered", "booked"].includes(l.stage)
      ) {
        await c.query("UPDATE followups SET state='cancelled' WHERE id=$1", [
          row.id,
        ]);
        return;
      }
      try {
        const provider = messaging();
        const sent = await provider.send({
          to: row.phone,
          body: row.body,
          key: row.dedupe_key,
        });
        await c.query(
          "UPDATE followups SET state='sent',provider=$2,provider_message_id=$3,sent_at=now() WHERE id=$1",
          [row.id, provider.name, sent.id],
        );
        await event(c, row.lead_id, "message.sent", "worker", {
          followupId: row.id,
        });
      } catch {
        await c.query(
          "UPDATE followups SET state='uncertain',error='Provider result ambiguous; reconcile before retry' WHERE id=$1",
          [row.id],
        );
        await event(c, row.lead_id, "message.uncertain", "worker", {
          followupId: row.id,
        });
      }
    });
  } finally {
    await lock.query("SELECT pg_advisory_unlock(22002)");
    lock.release();
  }
}
async function run() {
  while (true) {
    try {
      await tick();
    } catch {
      console.error("Messaging tick failed");
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
if (process.argv[1]?.endsWith("worker.ts")) void run();
