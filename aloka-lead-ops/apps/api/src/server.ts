import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { pool, tx, event } from "./db.js";
import { user, service, write } from "./auth.js";
import { intake } from "./leads.js";
import {
  intakeSchema,
  patchSchema,
  followupSchema,
  activitySchema,
  visitSchema,
  visitPatchSchema,
  quickSendSchema,
} from "../../../packages/contracts/src/index.js";
import { messaging } from "./messaging.js";
export function build() {
  const app = Fastify({
    bodyLimit: 65536,
    logger: { redact: ["req.headers.authorization", "req.headers.cookie"] },
  });
  app.register(cors, {
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
  });
  app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.setErrorHandler((err, req, reply) => {
    const e = err as Error & { statusCode?: number };
    if (e instanceof z.ZodError)
      return reply
        .code(400)
        .send({ error: "Invalid request", issues: e.issues });
    const status = e.statusCode || 500;
    return reply.code(status).send({
      error: status < 500 ? e.message : "Internal error",
      requestId: req.id,
    });
  });
  app.get("/health", async () => {
    await pool.query("SELECT 1");
    return { ok: true };
  });
  app.post("/v1/intake", async (req, reply) => {
    service(req, "INTAKE_TOKEN");
    return reply
      .code(202)
      .send(await intake(intakeSchema.parse(req.body), "intake"));
  });
  app.get("/v1/leads", async (req) => {
    const u = await user(req);
    const q = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(req.query);
    return (
      await pool.query(
        `SELECT * FROM leads WHERE ($1::text<>'sales' OR owner_id=$2::uuid) ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [u.role, u.id, q.limit, q.offset],
      )
    ).rows;
  });
  app.get("/v1/leads/:id", async (req) => {
    const u = await user(req);
    const id = z.uuid().parse((req.params as { id: string }).id);
    const { rows } = await pool.query(
      "SELECT * FROM leads WHERE id=$1 AND ($2::text<>'sales' OR owner_id=$3)",
      [id, u.role, u.id],
    );
    if (!rows[0]) throw Object.assign(Error("Not found"), { statusCode: 404 });
    return {
      lead: rows[0],
      events: (
        await pool.query(
          "SELECT * FROM events WHERE lead_id=$1 ORDER BY id DESC LIMIT 100",
          [id],
        )
      ).rows,
      followups: (
        await pool.query(
          "SELECT * FROM followups WHERE lead_id=$1 ORDER BY due_at DESC LIMIT 100",
          [id],
        )
      ).rows,
      activities: (
        await pool.query("SELECT * FROM activities WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 100", [id])
      ).rows,
      visits: (
        await pool.query("SELECT * FROM site_visits WHERE lead_id=$1 ORDER BY scheduled_at DESC LIMIT 100", [id])
      ).rows,
      documents: (
        await pool.query("SELECT id,kind,access_class,original_name,status,created_at,verified_at FROM documents WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 100", [id])
      ).rows,
      messages: (
        await pool.query("SELECT id,action,state,created_at FROM outbound_messages WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 100", [id])
      ).rows,
    };
  });
  app.patch("/v1/leads/:id", async (req) => {
    const u = await user(req);
    write(u.role);
    const p = patchSchema.parse(req.body);
    const id = z.uuid().parse((req.params as { id: string }).id);
    return tx(async (c) => {
      if (p.ownerId !== undefined && !["admin", "manager"].includes(u.role))
        throw Object.assign(Error("Forbidden"), { statusCode: 403 });
      if (p.ownerId) {
        const owner = await c.query("SELECT id FROM staff WHERE id=$1 AND active AND role='sales'", [p.ownerId]);
        if (!owner.rows[0]) throw Object.assign(Error("Invalid owner"), { statusCode: 400 });
      }
      const { rows } = await c.query(
        "UPDATE leads SET stage=coalesce($4,stage),opted_out=coalesce($5,opted_out),owner_id=CASE WHEN $6::boolean THEN $7 ELSE owner_id END,qualification=coalesce($8,qualification),lost_reason=CASE WHEN $9::boolean THEN $10 ELSE lost_reason END,updated_at=now() WHERE id=$1 AND ($2::text<>'sales' OR owner_id=$3) RETURNING *",
        [id, u.role, u.id, p.stage, p.optedOut, p.ownerId !== undefined, p.ownerId, p.qualification ? JSON.stringify(p.qualification) : null, p.lostReason !== undefined, p.lostReason],
      );
      if (!rows[0])
        throw Object.assign(Error("Not found"), { statusCode: 404 });
      if (
        rows[0].opted_out ||
        ["booked", "registered", "lost"].includes(rows[0].stage)
      )
        await c.query(
          "UPDATE followups SET state='cancelled' WHERE lead_id=$1 AND state='pending'",
          [id],
        );
      await event(c, id, "lead.updated", u.id, p);
      return rows[0];
    });
  });
  app.get("/v1/staff", async (req) => {
    const u = await user(req);
    if (!["admin", "manager"].includes(u.role)) throw Object.assign(Error("Forbidden"), { statusCode: 403 });
    return (await pool.query("SELECT id,name,role,active,capacity FROM staff ORDER BY active DESC,name")).rows;
  });
  app.post("/v1/leads/:id/activities", async (req, reply) => {
    const u = await user(req); write(u.role);
    const id = z.uuid().parse((req.params as { id: string }).id);
    const p = activitySchema.parse(req.body);
    return tx(async (c) => {
      const lead = await c.query("SELECT id FROM leads WHERE id=$1 AND ($2::text<>'sales' OR owner_id=$3)", [id, u.role, u.id]);
      if (!lead.rows[0]) throw Object.assign(Error("Not found"), { statusCode: 404 });
      const { rows } = await c.query("INSERT INTO activities(lead_id,kind,body,outcome,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [id,p.kind,p.body,p.outcome || null,p.dueAt || null,u.id]);
      await event(c,id,`activity.${p.kind}`,u.id,{ id: rows[0].id });
      return reply.code(201).send(rows[0]);
    });
  });
  app.post("/v1/leads/:id/site-visits", async (req, reply) => {
    const u = await user(req); write(u.role);
    const id = z.uuid().parse((req.params as { id: string }).id);
    const p = visitSchema.parse(req.body);
    return tx(async (c) => {
      const lead = await c.query("SELECT id FROM leads WHERE id=$1 AND ($2::text<>'sales' OR owner_id=$3)", [id,u.role,u.id]);
      if (!lead.rows[0]) throw Object.assign(Error("Not found"), { statusCode: 404 });
      const { rows } = await c.query("INSERT INTO site_visits(lead_id,scheduled_at,assigned_to,meeting_point,notes) VALUES($1,$2,$3,$4,$5) RETURNING *", [id,p.scheduledAt,p.assignedTo || u.id,p.meetingPoint,p.notes || null]);
      await c.query("UPDATE leads SET stage='visit_scheduled',updated_at=now() WHERE id=$1", [id]);
      await event(c,id,"site_visit.scheduled",u.id,{ id: rows[0].id });
      return reply.code(201).send(rows[0]);
    });
  });
  app.patch("/v1/site-visits/:id", async (req) => {
    const u = await user(req); write(u.role);
    const id = z.uuid().parse((req.params as { id: string }).id);
    const p = visitPatchSchema.parse(req.body);
    return tx(async (c) => {
      const { rows } = await c.query("UPDATE site_visits v SET status=$4,feedback=coalesce($5,feedback),plots_shown=coalesce($6,plots_shown) FROM leads l WHERE v.id=$1 AND l.id=v.lead_id AND ($2::text<>'sales' OR l.owner_id=$3) RETURNING v.*", [id,u.role,u.id,p.status,p.feedback || null,p.plotsShown || null]);
      if (!rows[0]) throw Object.assign(Error("Not found"), { statusCode: 404 });
      if (p.status === "completed") await c.query("UPDATE leads SET stage='visited',updated_at=now() WHERE id=$1", [rows[0].lead_id]);
      await event(c,rows[0].lead_id,`site_visit.${p.status}`,u.id,{ id });
      return rows[0];
    });
  });
  app.post("/v1/leads/:id/quick-send", async (req, reply) => {
    const u = await user(req); write(u.role);
    const id = z.uuid().parse((req.params as { id: string }).id);
    const p = quickSendSchema.parse(req.body);
    const templates = {
      share_brochure: "Hello Sir/Madam, here is the Aloka Green County brochure you requested. May I help you with a site visit?",
      confirm_site_visit: "Hello Sir/Madam, your Aloka Green County site visit is noted. Which designated pickup hub is convenient for you?",
      share_location: "Hello Sir/Madam, I can share the Aloka Green County site location. Will you self-drive or use a complimentary pickup hub?",
      request_callback: "Hello Sir/Madam, our team can call you to discuss Aloka Green County. What time is convenient for one callback?",
    } as const;
    const lead = (await pool.query("SELECT * FROM leads WHERE id=$1 AND ($2::text<>'sales' OR owner_id=$3)", [id,u.role,u.id])).rows[0];
    if (!lead) throw Object.assign(Error("Not found"), { statusCode: 404 });
    if (!lead.whatsapp_consent || lead.opted_out) throw Object.assign(Error("WhatsApp messaging is not permitted"), { statusCode: 409 });
    if (process.env.MESSAGING_ENABLED !== "true") throw Object.assign(Error("Messaging is disabled"), { statusCode: 503 });
    const body = templates[p.action];
    const row = (await pool.query("INSERT INTO outbound_messages(lead_id,action,body,state,sent_by) VALUES($1,$2,$3,'sending',$4) RETURNING id", [id,p.action,body,u.id])).rows[0];
    try {
      const provider = messaging();
      const receipt = await provider.send({ to: lead.phone, body, key: row.id });
      await tx(async (c) => {
        await c.query("UPDATE outbound_messages SET state='sent',provider=$2,provider_message_id=$3 WHERE id=$1", [row.id,provider.name,receipt.id]);
        await event(c,id,"message.sent",u.id,{ id:row.id, action:p.action });
      });
      return reply.code(202).send({ id:row.id, state:"sent" });
    } catch {
      await pool.query("UPDATE outbound_messages SET state='uncertain',error='Provider result requires review' WHERE id=$1", [row.id]);
      throw Object.assign(Error("Message result is uncertain; review provider history before retrying"), { statusCode: 502 });
    }
  });
  app.post("/v1/leads/:id/followups", async (req, reply) => {
    const u = await user(req);
    write(u.role);
    const p = followupSchema.parse(req.body);
    const id = z.uuid().parse((req.params as { id: string }).id);
    return tx(async (c) => {
      const l = await c.query(
        "SELECT id FROM leads WHERE id=$1 AND ($2::text<>'sales' OR owner_id=$3) FOR UPDATE",
        [id, u.role, u.id],
      );
      if (!l.rows[0])
        throw Object.assign(Error("Not found"), { statusCode: 404 });
      const { rows } = await c.query(
        "INSERT INTO followups(lead_id,dedupe_key,due_at,body) VALUES($1,$2,$3,$4) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",
        [id, id + ":" + p.key, p.dueAt, p.body],
      );
      if (rows[0])
        await event(c, id, "followup.scheduled", u.id, { id: rows[0].id });
      return reply.code(202).send({ id: rows[0]?.id, duplicate: !rows[0] });
    });
  });
  app.post("/v1/webhooks/openwa", async (req) => {
    service(req, "OPENWA_WEBHOOK_TOKEN");
    const p = z
      .object({
        eventId: z.string().min(1),
        phone: z.string(),
        body: z.string().max(4000),
      })
      .parse(req.body);
    const normalized = intakeSchema.shape.phone.parse(p.phone);
    return tx(async (c) => {
      const receipt = await c.query(
        "INSERT INTO provider_receipts(provider,event_id) VALUES('openwa',$1) ON CONFLICT DO NOTHING RETURNING event_id",
        [p.eventId],
      );
      if (!receipt.rows[0]) return { duplicate: true };
      const { rows } = await c.query(
        "SELECT id FROM leads WHERE phone=$1 FOR UPDATE",
        [normalized],
      );
      for (const l of rows) {
        await event(c, l.id, "message.received", "openwa", { body: p.body });
        await c.query(
          "UPDATE leads SET nurture_paused=true,updated_at=now() WHERE id=$1",
          [l.id],
        );
        if (/^(stop|unsubscribe|cancel)$/i.test(p.body.trim())) {
          await c.query(
            "UPDATE leads SET opted_out=true,updated_at=now() WHERE id=$1",
            [l.id],
          );
          await c.query(
            "UPDATE followups SET state='cancelled' WHERE lead_id=$1 AND state='pending'",
            [l.id],
          );
        }
      }
      return { ok: true };
    });
  });
  app.post("/v1/automation/followups", async (req, reply) => {
    service(req, "AUTOMATION_TOKEN");
    const p = followupSchema.extend({ leadId: z.uuid() }).parse(req.body);
    return tx(async (c) => {
      const lead = await c.query("SELECT * FROM leads WHERE id=$1 FOR UPDATE", [
        p.leadId,
      ]);
      if (!lead.rows[0])
        throw Object.assign(Error("Not found"), { statusCode: 404 });
      if (
        lead.rows[0].opted_out ||
        lead.rows[0].nurture_paused ||
        !lead.rows[0].whatsapp_consent
      )
        throw Object.assign(Error("Lead suppressed"), { statusCode: 409 });
      const result = await c.query(
        "INSERT INTO followups(lead_id,dedupe_key,due_at,body) VALUES($1,$2,$3,$4) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",
        [p.leadId, p.leadId + ":" + p.key, p.dueAt, p.body],
      );
      if (result.rows[0])
        await event(c, p.leadId, "followup.scheduled", "n8n", {
          id: result.rows[0].id,
        });
      return reply
        .code(202)
        .send({ id: result.rows[0]?.id, duplicate: !result.rows[0] });
    });
  });
  app.get("/v1/automation/export", async (req) => {
    service(req, "AUTOMATION_TOKEN");
    return (
      await pool.query(
        "SELECT id,name,phone,source,stage,owner_id,project_id,updated_at FROM leads ORDER BY id",
      )
    ).rows;
  });
  return app;
}
if (process.argv[1]?.endsWith("server.ts")) {
  const app = build();
  await app.listen({ port: Number(process.env.PORT || 4000), host: "0.0.0.0" });
}
