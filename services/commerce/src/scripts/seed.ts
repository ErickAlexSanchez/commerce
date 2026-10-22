import { randomUUID } from "node:crypto";
import pg from "pg";
import { counselServices, vesperPieces } from "@vesper-counsel/catalog";
import { defaultEnvPath, loadDotEnv } from "../composition/load-dot-env";
import { loadEnv } from "../composition/env";

export async function seed(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const piece of vesperPieces) {
      await client.query(
        `INSERT INTO inventory_items (sku, quantity, version)
         VALUES ($1, 20, 0)
         ON CONFLICT (sku) DO UPDATE SET quantity = EXCLUDED.quantity, version = 0`,
        [piece.sku],
      );
    }
    await client.query("DELETE FROM availability_slots WHERE status IN ('open', 'held')");
    const now = new Date();
    for (const service of counselServices) {
      for (let day = 1; day <= 14; day += 1) {
        for (const hour of [15, 18]) {
          const start = new Date(now.getTime());
          start.setUTCDate(start.getUTCDate() + day);
          start.setUTCHours(hour, 0, 0, 0);
          const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);
          await client.query(
            `INSERT INTO availability_slots
              (id, service_slug, starts_at, ends_at, status, version)
             VALUES ($1, $2, $3, $4, 'open', 0)`,
            [randomUUID(), service.slug, start, end],
          );
        }
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      const message = rollbackError instanceof Error ? rollbackError.message : "rollback failed";
      throw new AggregateError([error, rollbackError], `Seed rollback failed: ${message}`);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function seedFromEnv(databaseUrl: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    await seed(pool);
  } finally {
    await pool.end();
  }
}

async function run(): Promise<void> {
  loadDotEnv(defaultEnvPath());
  const env = loadEnv(process.env);
  await seedFromEnv(env.DATABASE_URL);
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("seed.ts") || entry.endsWith("seed.js")) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "seed failed";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
