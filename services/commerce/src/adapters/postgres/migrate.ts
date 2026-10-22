import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const migrationLock = 840401;

export async function migrate(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [migrationLock]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const directory = path.join(__dirname, "../../../migrations");
    const files = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const applied = await client.query<{ version: string }>(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [file],
      );
      if (applied.rowCount === 1) {
        continue;
      }
      const sql = fs.readFileSync(path.join(directory, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          const message = rollbackError instanceof Error ? rollbackError.message : "rollback failed";
          throw new AggregateError([error, rollbackError], `Migration rollback failed: ${message}`);
        }
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [migrationLock]);
    client.release();
  }
}
