const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { applyTestEnv } = require("./test-env.cjs");

module.exports = async function globalSetup() {
  applyTestEnv();
  const result = spawnSync("pnpm", ["exec", "tsx", "src/scripts/prepare-test-db.ts"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error("Could not prepare the test database. Start Postgres with docker compose up -d.");
  }
};
