import "dotenv/config";
import pg from "pg";
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function event(
  c: pg.PoolClient,
  lead: string,
  type: string,
  actor: string,
  data: unknown = {},
) {
  const { rows } = await c.query(
    "INSERT INTO events(lead_id,type,actor,data) VALUES($1,$2,$3,$4) RETURNING id",
    [lead, type, actor, JSON.stringify(data)],
  );
  await c.query(
    "INSERT INTO integration_jobs(event_id,destination) VALUES($1,'sheets')",
    [rows[0].id],
  );
  return rows[0].id;
}
