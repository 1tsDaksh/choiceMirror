import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Fresh, seeded data directory for every run; mirrored in
// tests/e2e/support/global-setup.ts, which populates it before tests.
const E2E_DATA_DIR = path.join(process.cwd(), "test-results", "e2e-data");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Every spec drives the single-flight POST /api/comparisons lock, so
  // parallel workers make cross-file runs collide (a UI run in one worker
  // answers 429 to an API test in another). One worker keeps the suite
  // deterministic without touching the Phase 1/2 specs.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  globalSetup: "./tests/e2e/support/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "npx --yes pnpm@12.18.0 --filter @choicemirror/web dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // Playwright's `env` replaces process.env unless spread, so the mock
      // endpoint overrides must ride on top of the inherited environment.
      env: {
        ...process.env,
        CHOICEMIRROR_DATA_DIR: E2E_DATA_DIR,
        // Client appends /chat/completions; base keeps the real …/v1 shape.
        NEBIUS_BASE_URL: "http://localhost:3099/v1",
        NEBIUS_API_KEY: "e2e-mock-key",
      },
    },
    {
      command:
        "npx --yes pnpm@12.18.0 --filter @choicemirror/benchmark dev",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "node tests/e2e/support/mock-nebius.ts",
      url: "http://localhost:3099/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
