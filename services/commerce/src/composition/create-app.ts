import http from "node:http";
import pg from "pg";
import { HmacSignedUrls } from "../adapters/signing/hmac-signed-urls";
import { createServer } from "../adapters/http/server";
import { logError } from "../adapters/log/logger";
import { migrate } from "../adapters/postgres/migrate";
import { PgCommerceStore } from "../adapters/postgres/store";
import { StripeSimulatorGateway } from "../adapters/stripe/stripe-simulator-gateway";
import type { Clock } from "../ports/clock";
import { systemClock } from "../ports/clock";
import type { CommerceStore } from "../ports/commerce-store";
import { allowedOrigins, type Env } from "./env";

export type AppHandle = {
  server: http.Server;
  store: CommerceStore;
  listen(port: number): Promise<void>;
  close(): Promise<void>;
};

export async function createApp(env: Env, options?: { clock?: Clock }): Promise<AppHandle> {
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    application_name: "vesper-counsel",
  });
  pool.on("error", (error: Error) => {
    logError({ msg: "pool_error", err: error.message });
  });
  await migrate(pool);
  const clock = options?.clock ?? systemClock;
  const store = new PgCommerceStore(pool);
  const payments = new StripeSimulatorGateway(env.WEBHOOK_SECRET);
  const server = createServer({
    env,
    clock,
    store,
    payments,
    signedUrls: new HmacSignedUrls(env.FILE_SIGNING_SECRET, clock, env.DOWNLOAD_URL_TTL_SECONDS),
    allowedOrigins: allowedOrigins(env),
  });

  return {
    server,
    store,
    listen(port: number): Promise<void> {
      return new Promise((resolve, reject) => {
        const onError = (error: Error) => {
          reject(error);
        };
        server.once("error", onError);
        server.listen(port, "127.0.0.1", () => {
          server.off("error", onError);
          resolve();
        });
      });
    },
    async close(): Promise<void> {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
      await pool.end();
    },
  };
}
