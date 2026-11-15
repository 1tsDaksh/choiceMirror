import { describe, expect, it } from "vitest";

import {
  artifactIdSchema,
  comparisonDetailSchema,
  comparisonIdSchema,
  journeyIdSchema,
  journeyRecordSchema,
  newArtifactId,
  newComparisonId,
  newJourneyId,
  parseComparisonId,
} from "./evidence";

const comparisonId = "cmp_ab12cd34ef567890";

describe("evidence id helpers", () => {
  it("newComparisonId matches comparisonIdSchema", () => {
    expect(comparisonIdSchema.safeParse(newComparisonId()).success).toBe(true);
  });

  it("newJourneyId matches journeyIdSchema", () => {
    const journeyId = newJourneyId(comparisonId, "join");
    expect(journeyId).toBe(`${comparisonId}-join`);
    expect(journeyIdSchema.safeParse(journeyId).success).toBe(true);
  });

  it("newArtifactId matches artifactIdSchema with checkpoint suffix", () => {
    const journeyId = newJourneyId(comparisonId, "leave");
    const artifactId = newArtifactId(journeyId, "step-1");
    expect(artifactId).toBe(`${journeyId}-step-1.png`);
    expect(artifactIdSchema.safeParse(artifactId).success).toBe(true);
  });

  it("parseComparisonId rejects traversal and malformed ids", () => {
    expect(parseComparisonId("../etc/passwd")).toBeNull();
    expect(parseComparisonId("cmp_zzz")).toBeNull();
    expect(parseComparisonId(`cmp_${"g".repeat(16)}`)).toBeNull();
  });

  it("parseComparisonId accepts a valid id", () => {
    expect(parseComparisonId(comparisonId)).toBe(comparisonId);
  });
});

describe("journeyRecordSchema", () => {
  const validRecord = {
    id: `${comparisonId}-join`,
    comparisonId,
    goalId: "join" as const,
    status: "completed" as const,
    seed: "phase-2",
    origin: "http://localhost:3001",
    viewport: { width: 1280, height: 720 },
    expectedActionCount: 1,
    actionCount: 1,
    startedAt: "2026-11-14T10:00:00.000Z",
    completedAt: "2026-11-14T10:00:04.000Z",
    events: [
      {
        stepNo: 0,
        timestamp: "2026-11-14T10:00:00.000Z",
        type: "navigate" as const,
        label: "Open fixture",
        outcome: "success" as const,
        countsAsAction: false,
      },
      {
        stepNo: 1,
        timestamp: "2026-11-14T10:00:02.000Z",
        type: "click" as const,
        label: "Join workspace",
        outcome: "success" as const,
        countsAsAction: true,
      },
    ],
    screenshots: [{ id: `${comparisonId}-join-start.png`, label: "Starting state" }],
  };

  it("parses a full record with two events", () => {
    expect(journeyRecordSchema.safeParse(validRecord).success).toBe(true);
  });

  it("rejects a negative actionCount", () => {
    const result = journeyRecordSchema.safeParse({
      ...validRecord,
      actionCount: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("comparisonDetailSchema", () => {
  it("rejects more than two journeys", () => {
    const journey = {
      id: `${comparisonId}-join`,
      comparisonId,
      goalId: "join" as const,
      status: "completed" as const,
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

    const result = comparisonDetailSchema.safeParse({
      comparison: {
        id: comparisonId,
        scenarioId: "membership-balanced",
        goalIds: ["join", "leave"],
        seed: "phase-2",
        status: "completed",
        createdAt: "2026-11-14T10:00:00.000Z",
      },
      journeys: [journey, journey, journey],
    });
    expect(result.success).toBe(false);
  });
});
