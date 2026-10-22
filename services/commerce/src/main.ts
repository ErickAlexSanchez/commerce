import { createApp } from "./composition/create-app";
import { defaultEnvPath, loadDotEnv } from "./composition/load-dot-env";
import { loadEnv } from "./composition/env";
import { logError, logInfo } from "./adapters/log/logger";
import { registerShutdown } from "./composition/shutdown";
import { seedFromEnv } from "./scripts/seed";

export async function start(options?: { seed?: boolean }): Promise<void> {
  loadDotEnv(defaultEnvPath());
  const env = loadEnv(process.env);
  const app = await createApp(env);
  try {
    if (options?.seed) {
      await seedFromEnv(env.DATABASE_URL);
    }
    await app.listen(env.PORT);
  } catch (error) {
    await app.close();
    throw error;
  }
  logInfo({ msg: "listening", port: env.PORT });
  registerShutdown(
    process,
    () => app.close(),
    (code) => {
      process.exit(code);
    },
    (message) => {
      logInfo({ msg: "shutdown", signal: message });
    },
  );
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("main.ts") || entry.endsWith("main.js")) {
  start().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "start failed";
    logError({ msg: "start_failed", err: message });
    process.exit(1);
  });
}
