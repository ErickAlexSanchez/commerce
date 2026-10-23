import { randomUUID } from "node:crypto";
import pg from "pg";
import { counselServices, demoAdminEmail, demoAdminPassword, vesperPieces } from "@vesper-counsel/catalog";
import { hashPassword } from "../application/passwords";
import { defaultEnvPath, loadDotEnv } from "../composition/load-dot-env";
import { loadEnv } from "../composition/env";

const demoAdminId = "00000000-0000-4000-8000-0000000000a1";

export async function seed(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const passwordHash = await hashPassword(demoAdminPassword);
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO admin_users (id, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [demoAdminId, demoAdminEmail, passwordHash],
    );
    for (const piece of vesperPieces) {
      await client.query(
        `INSERT INTO inventory_items (sku, quantity, version)
         VALUES ($1, 20, 0)
         ON CONFLICT (sku) DO UPDATE SET quantity = EXCLUDED.quantity, version = 0`,
        [piece.sku],
      );
      await client.query(
        `INSERT INTO catalog_listings (sku, brand, name, price_cents)
         VALUES ($1, 'vesper', $2, $3)
         ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, price_cents = EXCLUDED.price_cents`,
        [piece.sku, piece.name, piece.priceCents],
      );
    }
    for (const service of counselServices) {
      await client.query(
        `INSERT INTO catalog_listings (sku, brand, name, price_cents)
         VALUES ($1, 'counsel', $2, $3)
         ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, price_cents = EXCLUDED.price_cents`,
        [service.sku, service.name, service.priceCents],
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
