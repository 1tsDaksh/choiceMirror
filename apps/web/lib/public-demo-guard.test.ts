import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isAllowedPublicDemoOrigin,
  publicDemoReady,
  reservePublicDemoRequest,
} from "./public-demo-guard";

let root = "";
function request(ip = "192.0.2.5", origin = "https://demo.example"): Request {
  return new Request("https://demo.example/api/comparisons", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ mode: "ai" }),
  });
}

describe("public demo quota and origin guard", () => {
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "choicemirror-public-"));
    vi.stubEnv("PUBLIC_DEMO_ENABLED", "1");
    vi.stubEnv("RAILWAY_VOLUME_MOUNT_PATH", root);
    vi.stubEnv("CHOICEMIRROR_DATA_DIR", root);
    vi.stubEnv("NEBIUS_API_KEY", "unit-test-only-placeholder");
    vi.stubEnv("PUBLIC_DEMO_DAILY_TOTAL_LIMIT", "4");
    vi.stubEnv("PUBLIC_DEMO_DAILY_AI_LIMIT", "2");
    vi.stubEnv("PUBLIC_DEMO_DAILY_VISITOR_LIMIT", "2");
    vi.stubEnv("PUBLIC_DEMO_HASH_SECRET", "test-only");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("allows only same-origin JSON in public mode", () => {
    expect(isAllowedPublicDemoOrigin(request())).toBe(true);
    expect(isAllowedPublicDemoOrigin(request("192.0.2.5", "https://evil.example"))).toBe(false);
    expect(isAllowedPublicDemoOrigin(new Request("https://demo.example/api/comparisons", {
      method: "POST", body: "{}", headers: { origin: "https://demo.example" },
    }))).toBe(false);
  });

  it("fails closed when the persistent volume or key is missing", () => {
    expect(publicDemoReady()).toBe(true);
    vi.stubEnv("RAILWAY_VOLUME_MOUNT_PATH", "");
    expect(publicDemoReady()).toBe(false);
    const denied = reservePublicDemoRequest(request(), "ai");
    expect(denied).toMatchObject({ allowed: false, status: 503 });
  });

  it("persists a global AI-credit cap across visitors", () => {
    expect(reservePublicDemoRequest(request("192.0.2.1"), "ai")).toEqual({ allowed: true });
    expect(reservePublicDemoRequest(request("192.0.2.2"), "ai")).toEqual({ allowed: true });
    const blocked = reservePublicDemoRequest(request("192.0.2.3"), "ai");
    expect(blocked).toMatchObject({ allowed: false, status: 429 });
    expect(readFileSync(path.join(root, "public-demo-usage-v1.json"), "utf8"))
      .toContain('"ai":2');
  });

  it("enforces per-visitor and total run caps, even for deterministic requests", () => {
    expect(reservePublicDemoRequest(request("192.0.2.5"), "deterministic")).toEqual({ allowed: true });
    expect(reservePublicDemoRequest(request("192.0.2.5"), "deterministic")).toEqual({ allowed: true });
    expect(reservePublicDemoRequest(request("192.0.2.5"), "deterministic"))
      .toMatchObject({ allowed: false, status: 429 });
    expect(reservePublicDemoRequest(request("192.0.2.6"), "deterministic")).toEqual({ allowed: true });
    expect(reservePublicDemoRequest(request("192.0.2.7"), "deterministic")).toEqual({ allowed: true });
    expect(reservePublicDemoRequest(request("192.0.2.8"), "deterministic"))
      .toMatchObject({ allowed: false, status: 429 });
  });

  it("never permits paid execution if the persisted record is corrupt", () => {
    expect(reservePublicDemoRequest(request(), "ai")).toEqual({ allowed: true });
    const filename = path.join(root, "public-demo-usage-v1.json");
    const previous = readFileSync(filename, "utf8");
    expect(previous).toContain('"total":1');
    writeFileSync(filename, "{not-json");
    expect(reservePublicDemoRequest(request("192.0.2.20"), "ai"))
      .toMatchObject({ allowed: false, status: 503 });
  });

  it("keeps the existing local development behaviour when public mode is disabled", () => {
    vi.stubEnv("PUBLIC_DEMO_ENABLED", "0");
    vi.stubEnv("RAILWAY_VOLUME_MOUNT_PATH", "");
    expect(isAllowedPublicDemoOrigin(request("192.0.2.5", "https://evil.example"))).toBe(true);
    expect(reservePublicDemoRequest(request(), "ai")).toEqual({ allowed: true });
  });
});
