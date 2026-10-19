import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("Migration, dedupe, event immutability, and queue constraints", async () => {
  const db = new PGlite();
  try {
    const sql = (
      await readFile("database/migrations/001_core.sql", "utf8")
    ).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;", "");
    await db.exec(sql);
    await db.exec(
      await readFile("database/migrations/002_reply_pause.sql", "utf8"),
    );
    await db.exec(
      await readFile("database/migrations/003_operational_crm.sql", "utf8"),
    );
    const r = await db.query<{ id: string }>(
      "INSERT INTO leads(phone,name,project_id,source) VALUES('+919187969708','Test buyer','aloka-green-county','manual') RETURNING id",
    );
    const id = r.rows[0].id;
    await assert.rejects(() =>
      db.query(
        "INSERT INTO leads(phone,name,project_id,source) VALUES('+919187969708','Duplicate','aloka-green-county','manual')",
      ),
    );
    await db.query(
      "INSERT INTO events(lead_id,type,actor) VALUES($1,'lead.created','test')",
      [id],
    );
    await assert.rejects(() => db.exec("UPDATE events SET type='changed'"));
    await assert.rejects(() => db.exec("DELETE FROM events"));
    await assert.rejects(() =>
      db.query("UPDATE leads SET stage='invalid' WHERE id=$1", [id]),
    );
    await db.query(
      "INSERT INTO followups(lead_id,dedupe_key,due_at,body) VALUES($1,'welcome',now(),'Hello')",
      [id],
    );
    await assert.rejects(() =>
      db.query(
        "INSERT INTO followups(lead_id,dedupe_key,due_at,body) VALUES($1,'welcome',now(),'Hello')",
        [id],
      ),
    );
    const staff = await db.query<{ id: string }>(
      "INSERT INTO staff(id,name,role) VALUES(gen_random_uuid(),'Demo Executive','sales') RETURNING id",
    );
    await db.query(
      "INSERT INTO activities(lead_id,kind,body,created_by) VALUES($1,'call','Discussed site visit',$2)",
      [id, staff.rows[0].id],
    );
    await db.query(
      "INSERT INTO site_visits(lead_id,scheduled_at,assigned_to,meeting_point) VALUES($1,now(),$2,'Hope Farm')",
      [id, staff.rows[0].id],
    );
    await assert.rejects(() =>
      db.query(
        "INSERT INTO activities(lead_id,kind,body,created_by) VALUES($1,'payment','Invalid',$2)",
        [id, staff.rows[0].id],
      ),
    );
  } finally {
    await db.close();
  }
});
