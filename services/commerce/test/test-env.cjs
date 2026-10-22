const env = {
  NODE_ENV: "test",
  PORT: "3401",
  DATABASE_URL: "postgres://commerce:commerce@127.0.0.1:5435/commerce_test",
  WEBHOOK_SECRET: "whsec_local_simulator_only",
  FILE_SIGNING_SECRET: "local_file_signing_secret_xx",
  DOWNLOAD_URL_TTL_SECONDS: "120",
  STRIPE_MODE: "simulator",
  VESPER_ORIGIN: "http://127.0.0.1:3402",
  COUNSEL_ORIGIN: "http://127.0.0.1:3403",
  PUBLIC_BASE_URL: "http://127.0.0.1:3401",
};

function applyTestEnv() {
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
}

module.exports = { applyTestEnv, env };
