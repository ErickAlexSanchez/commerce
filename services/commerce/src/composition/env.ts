import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3401),
  DATABASE_URL: z
    .string()
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres URL",
    ),
  WEBHOOK_SECRET: z.string().min(16),
  FILE_SIGNING_SECRET: z.string().min(16),
  DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(120),
  STRIPE_MODE: z.literal("simulator"),
  VESPER_ORIGIN: z.string().url(),
  COUNSEL_ORIGIN: z.string().url(),
  ADMIN_ORIGIN: z.string().url().default("http://127.0.0.1:3404"),
  PUBLIC_BASE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".") || "environment").join(", ");
    throw new Error(`Invalid environment: ${fields}`);
  }
  return parsed.data;
}

export function allowedOrigins(env: Env): Set<string> {
  const origins = new Set<string>();
  for (const value of [env.VESPER_ORIGIN, env.COUNSEL_ORIGIN, env.ADMIN_ORIGIN]) {
    origins.add(value);
    const url = new URL(value);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      origins.add(url.origin);
    } else if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
      origins.add(url.origin);
    }
  }
  return origins;
}
