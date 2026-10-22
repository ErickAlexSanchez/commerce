import pg from "pg";
import { migrate } from "../adapters/postgres/migrate";
import { defaultEnvPath, loadDotEnv } from "../composition/load-dot-env";
import { loadEnv } from "../composition/env";

async function run(): Promise<void> {
  loadDotEnv(defaultEnvPath());
  const env = loadEnv(process.env);
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 2 });
  try {
    await migrate(pool);
  } finally {
    await pool.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "migrate failed";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
