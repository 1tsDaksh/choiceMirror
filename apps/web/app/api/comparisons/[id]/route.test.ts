import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  comparisonDetailSchema,
  type ComparisonRecord,
  type JourneyRecord,
} from "@choicemirror/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const comparisonId = "cmp_ab12cd34ef567890";

function comparisonRecord(): ComparisonRecord {
  return {
    id: comparisonId,
    scenarioId: "membership-balanced",
    goalIds: ["join", "leave"],
    seed: "phase-2",
    status: "completed",
    createdAt: "2026-11-15T10:00:00.000Z",
    completedAt: "2026-11-15T10:00:06.000Z",
  };
}

function journeyRecord(goalId: "join" | "leave"): JourneyRecord {
  return {
    id: `${comparisonId}-${goalId}`,
    comparisonId,
    goalId,
    status: "completed",
    seed: "phase-2",
    origin: "http://localhost:3001",
    viewport: { width: 1280, height: 720 },
    expectedActionCount: 1,
    actionCount: 1,
    startedAt: "2026-11-15T10:00:00.000Z",
    completedAt: "2026-11-15T10:00:03.000Z",
    events: [
      {
        stepNo: 0,
        timestamp: "2026-11-15T10:00:00.000Z",
        type: "navigate",
        label: "Open fixture",
        outcome: "success",
        countsAsAction: false,
      },
    ],
    screenshots: [
      {
        id: `${comparisonId}-${goalId}-start.png`,
        label: "Starting state",
      },
    ],
  };
}

async function getComparison(id: string): Promise<Response> {
  const { GET } = await import("./route");
  return GET(new Request(`http://localhost/api/comparisons/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/comparisons/[id]", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "cm-detail-"));
    vi.resetModules();
    vi.stubEnv("CHOICEMIRROR_DATA_DIR", root);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it("serves a stored comparison with both journeys", async () => {
    const { getStore } = await import("../../../../lib/comparison-store");
    const store = getStore();
    await store.saveComparison(comparisonRecord());
    await store.saveJourney(journeyRecord("join"));
    await store.saveJourney(journeyRecord("leave"));

    const response = await getComparison(comparisonId);

    expect(response.status).toBe(200);
    const body = await response.json();
    const detail = comparisonDetailSchema.parse(body);
    expect(detail.comparison.id).toBe(comparisonId);
    expect(detail.journeys).toHaveLength(2);
    expect(detail.journeys.map((journey) => journey.goalId)).toEqual([
      "join",
      "leave",
    ]);
  });

  it("returns 404 for an unknown comparison", async () => {
    const response = await getComparison("cmp_0000000000000000");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Comparison not found.",
    });
  });

  it("returns 404 for a traversal id instead of touching the filesystem", async () => {
    const response = await getComparison("../record");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Comparison not found.",
    });
  });

  it("returns 404 for a corrupted stored record", async () => {
    const { getStore } = await import("../../../../lib/comparison-store");
    await getStore().saveComparison(comparisonRecord());
    await writeFile(
      path.join(root, "comparisons", comparisonId, "record.json"),
      "not json",
    );

    const response = await getComparison(comparisonId);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Comparison not found.",
    });
  });
});
