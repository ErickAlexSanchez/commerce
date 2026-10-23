import type { IncomingMessage, ServerResponse } from "node:http";
import { logError } from "./adapters/log/logger";
import { createCatalogApp } from "./composition/catalog-app";
import { createApp, type AppHandle } from "./composition/create-app";
import { loadEnv } from "./composition/env";
import { defaultEnvPath, loadDotEnv } from "./composition/load-dot-env";

loadDotEnv(defaultEnvPath());

let pending: Promise<AppHandle> | undefined;

function databaseConfigured(source: NodeJS.ProcessEnv): boolean {
  const value = source.DATABASE_URL;
  return value !== undefined && value.length > 0;
}

function appHandle(): Promise<AppHandle> {
  if (!pending) {
    const opening = databaseConfigured(process.env)
      ? createApp(loadEnv(process.env))
      : Promise.resolve(createCatalogApp());
    pending = opening.catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const handle = await appHandle();
    handle.server.emit("request", req, res);
  } catch (error: unknown) {
    logError({ msg: "start_failed", err: error instanceof Error ? error.name : "error" });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(JSON.stringify({ error: { code: "internal", message: "Commerce API failed to start." } }));
    }
  }
}
