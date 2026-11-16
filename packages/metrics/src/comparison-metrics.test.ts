import { describe, expect, test } from "vitest";

import type {
  AiJourneySummary,
  ComparisonRecord,
  JourneyRecord,
  TraceEvent,
} from "@choicemirror/contracts";

import { computeComparisonMetrics } from "./comparison-metrics";
import { comparisonMetricsSchema } from "./schemas";

function comparison(overrides: Partial<ComparisonRecord> = {}): ComparisonRecord {
  return {
    id: "cmp_ab12cd34ef567890",
    scenarioId: "membership-asymmetric",
    goalIds: ["join", "leave"],
    seed: "42",
    status: "completed",
    createdAt: "2026-11-16T10:00:00.000Z",
    ...overrides,
  };
}

type JourneyOptions = {
  status?: JourneyRecord["status"];
  actions?: number;
  seed?: string;
  origin?: string;
  viewport?: { width: number; height: number };
  mode?: JourneyRecord["mode"];
  ai?: AiJourneySummary;
  startedAt?: string;
  completedAt?: string;
};

function makeEvent(
  stepNo: number,
  type: TraceEvent["type"],
  overrides: Partial<TraceEvent> = {},
): TraceEvent {
  return {
    stepNo,
    timestamp: "2026-11-16T10:00:01.000Z",
    type,
    label: `${type} step`,
    outcome: "success",
    countsAsAction: type === "click",
    screenshotId: `shot-${stepNo}.png`,
    ...overrides,
  };
}

function journey(
  goalId: JourneyRecord["goalId"],
  options: JourneyOptions = {},
): JourneyRecord {
  const {
    status = "completed",
    actions = 1,
    seed = "42",
    origin = "http://127.0.0.1:3000",
    viewport = { width: 1280, height: 720 },
    mode,
    ai,
    startedAt = "2026-11-16T10:00:00.000Z",
    completedAt = "2026-11-16T10:00:05.000Z",
  } = options;

  const events: TraceEvent[] = [
    makeEvent(1, "navigate"),
    makeEvent(2, "goal-selected"),
  ];
  for (let i = 0; i < actions; i += 1) {
    events.push(makeEvent(3 + i, "click"));
  }
  events.push(makeEvent(3 + actions, "complete"));

  return {
    id: `cmp_ab12cd34ef567890-${goalId}`,
    comparisonId: "cmp_ab12cd34ef567890",
    goalId,
    status,
    seed,
    origin,
    viewport,
    expectedActionCount: actions,
    actionCount: actions,
    startedAt,
    completedAt,
    events,
    screenshots: events
      .filter((event) => event.screenshotId !== undefined)
      .map((event) => ({
        id: event.screenshotId as string,
        label: `Step ${event.stepNo}`,
      })),
    ...(mode !== undefined ? { mode } : {}),
    ...(ai !== undefined ? { ai } : {}),
    ...(status === "failed" ? { error: "journey failed" } : {}),
  };
}

describe("computeComparisonMetrics", () => {
  test("orders journeys by comparison goalIds, not by array position", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys: [journey("leave"), journey("join")],
    });

    expect(metrics.journeys[0].goalId).toBe("join");
    expect(metrics.journeys[1].goalId).toBe("leave");
    expect(metrics.journeys[0].journeyId).toBe("cmp_ab12cd34ef567890-join");
  });

  test("reports balanced when both journeys completed with equal counts", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys: [journey("join", { actions: 1 }), journey("leave", { actions: 1 })],
    });

    expect(metrics.actionDifference).toBe(0);
    expect(metrics.heavierJourney).toBeNull();
    expect(metrics.actionRatio).toBeCloseTo(1);
    expect(metrics.result).toBe("balanced");
    expect(metrics.comparableConditions.comparable).toBe(true);
    expect(metrics.comparableConditions.reasons).toEqual([]);
  });

  test("reports observed asymmetry with difference and ratio for 1 vs 3", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys: [journey("join", { actions: 1 }), journey("leave", { actions: 3 })],
    });

    expect(metrics.actionDifference).toBe(2);
    expect(metrics.heavierJourney).toBe("b");
    expect(metrics.actionRatio).toBeCloseTo(2);
    expect(metrics.result).toBe("observed-asymmetry");
  });

  test("stays inconclusive with null difference when a journey failed", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison({ status: "failed" }),
      journeys: [
        journey("join", { actions: 1 }),
        journey("leave", { actions: 3, status: "failed" }),
      ],
    });

    expect(metrics.actionDifference).toBeNull();
    expect(metrics.heavierJourney).toBeNull();
    expect(metrics.actionRatio).toBeNull();
    expect(metrics.result).toBe("inconclusive");
    expect(metrics.comparableConditions.reasons).toContain(
      "Journey B (leave) did not complete (failed).",
    );
  });

  test("stays inconclusive when a journey is missing", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys: [journey("join", { actions: 1 })],
    });

    expect(metrics.journeys[1].outcome).toBe("pending");
    expect(metrics.journeys[1].journeyId).toBeNull();
    expect(metrics.actionDifference).toBeNull();
    expect(metrics.result).toBe("inconclusive");
    expect(metrics.comparableConditions.reasons).toContain(
      "Journey B (leave) has no recorded evidence yet.",
    );
  });

  test("stays inconclusive while the comparison is still running with one journey done", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison({ status: "running" }),
      journeys: [journey("join", { actions: 1 })],
    });

    expect(metrics.status).toBe("running");
    expect(metrics.result).toBe("inconclusive");
    expect(metrics.actionDifference).toBeNull();
  });

  test("lists comparability reasons for differing seeds origins viewports or modes", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys: [
        journey("join", { actions: 1 }),
        journey("leave", {
          actions: 3,
          seed: "7",
          origin: "http://127.0.0.1:4000",
          viewport: { width: 390, height: 844 },
          mode: "ai",
        }),
      ],
    });

    expect(metrics.comparableConditions.comparable).toBe(false);
    expect(metrics.comparableConditions.reasons).toEqual([
      "Seeds differ between journeys.",
      "Origins differ between journeys.",
      "Viewports differ between journeys.",
      "Execution modes differ between journeys.",
    ]);
    expect(metrics.result).toBe("inconclusive");
  });

  test("computes valid metrics from legacy phase 2 records without mode or ai", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys: [journey("join", { actions: 1 }), journey("leave", { actions: 3 })],
    });

    expect(metrics.result).toBe("observed-asymmetry");
    expect(metrics.actionDifference).toBe(2);
    expect(metrics.journeys[0].ai).toBeNull();
    expect(metrics.comparableConditions.reasons).toEqual([]);
    expect(comparisonMetricsSchema.parse(metrics)).toEqual(metrics);
  });

  test("keeps duration null from invalid timestamps without breaking the comparison", () => {
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys: [
        journey("join", { actions: 1, startedAt: "not-a-date" }),
        journey("leave", { actions: 3 }),
      ],
    });

    expect(metrics.journeys[0].durationMs).toBeNull();
    expect(metrics.journeys[1].durationMs).toBe(5000);
    expect(metrics.result).toBe("observed-asymmetry");
    expect(comparisonMetricsSchema.parse(metrics)).toEqual(metrics);
  });
});
