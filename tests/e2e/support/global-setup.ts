import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import { writeSeedData } from "./seed-fixtures";

// Mirrors the E2E_DATA_DIR const in playwright.config.ts: the web app's
// webServer env and this setup hook must agree on the same directory.
const E2E_DATA_DIR = path.join(process.cwd(), "test-results", "e2e-data");

export default function globalSetup(): void {
  rmSync(E2E_DATA_DIR, { recursive: true, force: true });
  mkdirSync(E2E_DATA_DIR, { recursive: true });
  writeSeedData(E2E_DATA_DIR);
}
