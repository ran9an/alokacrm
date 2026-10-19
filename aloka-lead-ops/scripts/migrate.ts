import { readFile, readdir } from "node:fs/promises";
import { pool, tx } from "../apps/api/src/db.js";
try {
  await tx(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(33003)");
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz DEFAULT now())",
    );
    for (const file of (await readdir("database/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      if (
        !(
          await c.query("SELECT 1 FROM schema_migrations WHERE name=$1", [file])
        ).rowCount
      ) {
        await c.query(await readFile("database/migrations/" + file, "utf8"));
        await c.query("INSERT INTO schema_migrations(name) VALUES($1)", [file]);
        console.log("Applied " + file);
      }
    }
  });
} finally {
  await pool.end();
}
