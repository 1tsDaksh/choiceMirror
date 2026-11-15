import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ComparisonRecord } from "@choicemirror/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const comparisonId = "cmp_ab12cd34ef567890";

function runningRecord(): ComparisonRecord {
  return {
    id: comparisonId,
    scenarioId: "membership-balanced",
    goalIds: ["join", "leave"],
    seed: "phase-2",
    status: "running",
    createdAt: "2026-11-14T10:00:00.000Z",
  };
}

describe("getStore", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "cm-web-store-"));
    vi.resetModules();
    vi.stubEnv("CHOICEMIRROR_DATA_DIR", root);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it("stores records under the CHOICEMIRROR_DATA_DIR root", async () => {
    const { getStore } = await import("./comparison-store");

    await getStore().saveComparison(runningRecord());

    await expect(
      access(path.join(root, "comparisons", comparisonId, "record.json")),
    ).resolves.toBeUndefined();
  });

  it("returns the same store instance for repeated calls", async () => {
    const { getStore } = await import("./comparison-store");

    expect(getStore()).toBe(getStore());
  });

  it("round-trips a minimal comparison record", async () => {
    const { getStore } = await import("./comparison-store");
    const store = getStore();
    const record = runningRecord();

    await store.saveComparison(record);

    expect(await store.getComparison(comparisonId)).toEqual(record);
  });
});
