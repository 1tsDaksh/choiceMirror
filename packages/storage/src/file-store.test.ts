import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ComparisonRecord, JourneyRecord } from "@choicemirror/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createFileStore } from "./file-store";

const comparisonId = "cmp_ab12cd34ef567890";

function comparisonRecord(): ComparisonRecord {
  return {
    id: comparisonId,
    scenarioId: "membership-balanced",
    goalIds: ["join", "leave"],
    seed: "phase-2",
    status: "running",
    createdAt: "2026-11-14T10:00:00.000Z",
  };
}

function journeyRecord(suffix: string): JourneyRecord {
  return {
    id: `${comparisonId}-${suffix}`,
    comparisonId,
    goalId: suffix === "join" ? "join" : "leave",
    status: "completed",
    seed: "phase-2",
    origin: "http://localhost:3001",
    viewport: { width: 1280, height: 720 },
    expectedActionCount: 1,
    actionCount: 1,
    startedAt: "2026-11-14T10:00:00.000Z",
    completedAt: "2026-11-14T10:00:04.000Z",
    events: [],
    screenshots: [],
  };
}

describe("createFileStore", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "cm-store-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("round-trips a comparison record", async () => {
    const store = createFileStore(root);
    const record = comparisonRecord();

    await store.saveComparison(record);

    expect(await store.getComparison(comparisonId)).toEqual(record);
  });

  it("returns null for an unknown comparison", async () => {
    const store = createFileStore(root);

    expect(await store.getComparison("cmp_0000000000000000")).toBeNull();
  });

  it("returns null for a corrupted record and skips corrupted journeys", async () => {
    const store = createFileStore(root);
    await store.saveComparison(comparisonRecord());
    await store.saveJourney(journeyRecord("join"));

    await mkdir(path.join(root, "comparisons", comparisonId), {
      recursive: true,
    });
    await writeFile(
      path.join(root, "comparisons", comparisonId, "record.json"),
      "not json",
    );
    await writeFile(
      path.join(
        root,
        "comparisons",
        comparisonId,
        "journeys",
        `${comparisonId}-leave.json`,
      ),
      "{ broken",
    );

    expect(await store.getComparison(comparisonId)).toBeNull();

    const journeys = await store.getJourneys(comparisonId);
    expect(journeys).toHaveLength(1);
    expect(journeys[0]?.id).toBe(`${comparisonId}-join`);
  });

  it("round-trips journeys and returns all of them", async () => {
    const store = createFileStore(root);
    const join = journeyRecord("join");
    const leave = journeyRecord("leave");

    await store.saveJourney(join);
    await store.saveJourney(leave);

    const journeys = await store.getJourneys(comparisonId);
    expect(journeys).toHaveLength(2);
    expect(journeys).toContainEqual(join);
    expect(journeys).toContainEqual(leave);
  });

  it("round-trips screenshot bytes", async () => {
    const store = createFileStore(root);
    const artifactId = `${comparisonId}-join-start.png`;
    const bytes = Uint8Array.from([137, 80, 78, 71]);

    await store.saveScreenshot(comparisonId, artifactId, bytes);

    const loaded = await store.getScreenshot(comparisonId, artifactId);
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded ?? [])).toEqual([137, 80, 78, 71]);
  });

  it("returns null for an unknown screenshot", async () => {
    const store = createFileStore(root);

    expect(
      await store.getScreenshot(comparisonId, `${comparisonId}-join-start.png`),
    ).toBeNull();
  });

  it("rejects traversal and malformed ids before touching the filesystem", async () => {
    const store = createFileStore(root);

    await expect(store.getComparison("../x")).rejects.toThrow(
      "Invalid storage id",
    );
    await expect(
      store.getScreenshot(comparisonId, "../../evil.png"),
    ).rejects.toThrow("Invalid storage id");
    await expect(
      store.saveScreenshot(comparisonId, "..%2f..%2frecord.json", new Uint8Array()),
    ).rejects.toThrow("Invalid storage id");
    await expect(store.getJourneys("../other")).rejects.toThrow(
      "Invalid storage id",
    );
    await expect(
      store.saveJourney({ ...journeyRecord("join"), id: "not-a-journey-id" }),
    ).rejects.toThrow("Invalid storage id");
  });
});
