import { defineConfig } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://commerce:commerce@127.0.0.1:5435/commerce";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { trace: "on-first-retry" },
  webServer: [
    {
      command: "pnpm --filter @vesper-counsel/commerce start:e2e",
      url: "http://127.0.0.1:3401/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        PORT: "3401",
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? "whsec_local_simulator_only",
        FILE_SIGNING_SECRET: process.env.FILE_SIGNING_SECRET ?? "local_file_signing_secret_xx",
        DOWNLOAD_URL_TTL_SECONDS: process.env.DOWNLOAD_URL_TTL_SECONDS ?? "120",
        STRIPE_MODE: "simulator",
        VESPER_ORIGIN: "http://127.0.0.1:3402",
        COUNSEL_ORIGIN: "http://127.0.0.1:3403",
        ADMIN_ORIGIN: "http://127.0.0.1:3404",
        PUBLIC_BASE_URL: "http://127.0.0.1:3401",
      },
    },
    {
      command: "pnpm --filter @vesper-counsel/vesper dev",
      url: "http://127.0.0.1:3402",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter @vesper-counsel/counsel dev",
      url: "http://127.0.0.1:3403",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
