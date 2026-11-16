import { defineConfig, devices } from "@playwright/test";

/**
 * Opt-in live evaluation against the real Nebius API. Never wired into
 * `test:e2e` or CI: it requires NEBIUS_LIVE=1 + NEBIUS_API_KEY and spends
 * real credits. The spec drives `runAiJourney` directly, so only the
 * benchmark app is started — no mock server, no web app.
 */
export default defineConfig({
  testDir: "./tests/live",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
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
        "npx --yes pnpm@12.18.0 --filter @choicemirror/benchmark dev",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
