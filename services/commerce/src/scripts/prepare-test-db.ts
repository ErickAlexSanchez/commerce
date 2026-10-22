import pg from "pg";
import { migrate } from "../adapters/postgres/migrate";

function adminUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = "/commerce";
  return url.toString();
}

export async function prepareTestDatabase(): Promise<void> {
  const testUrl = process.env.DATABASE_URL;
  if (!testUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const admin = new pg.Client({ connectionString: adminUrl(testUrl) });
  try {
    await admin.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : "connection failed";
    throw new Error(`Postgres is not reachable on port 5435. Start it with docker compose up -d. ${message}`);
  }
  try {
    const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", ["commerce_test"]);
    if ((existing.rowCount ?? 0) === 0) {
      await admin.query("CREATE DATABASE commerce_test");
    }
  } finally {
    await admin.end();
  }
  const pool = new pg.Pool({ connectionString: testUrl, max: 2 });
  try {
    await migrate(pool);
  } finally {
    await pool.end();
  }
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("prepare-test-db.ts") || entry.endsWith("prepare-test-db.js")) {
  prepareTestDatabase().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "prepare failed";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
