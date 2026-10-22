import { start } from "../main";
import { logError } from "../adapters/log/logger";

start({ seed: true }).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "start failed";
  logError({ msg: "start_failed", err: message });
  process.exit(1);
});
