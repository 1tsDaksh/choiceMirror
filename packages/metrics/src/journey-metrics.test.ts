import { describe, expect, test } from "vitest";

import type { AiJourneySummary, JourneyRecord, TraceEvent } from "@choicemirror/contracts";

import { computeJourneyMetrics } from "./journey-metrics";
import { journeyMetricsSchema } from "./schemas";

const COMPARISON_ID = "cmp_ab12cd34ef567890";
const JOURNEY_ID = `${COMPARISON_ID}-join`;

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
    screenshotId: `join-step-${stepNo}.png`,
    ...overrides,
  };
}

function journey(overrides: Partial<JourneyRecord> = {}): JourneyRecord {
  const events =
    overrides.events ??
    [
      makeEvent(1, "navigate"),
      makeEvent(2, "goal-selected"),
      makeEvent(3, "click"),
      makeEvent(4, "complete"),
    ];
  return {
    id: JOURNEY_ID,
    comparisonId: COMPARISON_ID,
    goalId: "join",
    status: "completed",
    seed: "42",
    origin: "http://127.0.0.1:3000",
    viewport: { width: 1280, height: 720 },
    expectedActionCount: 1,
    actionCount: 1,
    startedAt: "2026-11-16T10:00:00.000Z",
    completedAt: "2026-11-16T10:00:05.000Z",
    events,
    screenshots: events
      .filter((event) => event.screenshotId !== undefined)
      .map((event) => ({
        id: event.screenshotId as string,
        label: `Step ${event.stepNo}`,
      })),
    ...overrides,
  };
}

describe("computeJourneyMetrics", () => {
  test("counts only successful counted actions and excludes navigation and goal selection", () => {
    const events = [
      makeEvent(1, "navigate", { countsAsAction: false }),
      makeEvent(2, "goal-selected", { countsAsAction: false }),
      makeEvent(3, "click", { countsAsAction: true }),
      makeEvent(4, "click", { countsAsAction: true, outcome: "failure" }),
      makeEvent(5, "complete", { countsAsAction: false }),
    ];

    const metrics = computeJourneyMetrics(journey({ events }), "join");

    expect(metrics.actionCount).toBe(1);
    expect(metrics.navigationEventCount).toBe(1);
  });

  test("counts only unique successful click steps as actions", () => {
    const events = [
      makeEvent(1, "navigate", { countsAsAction: true }),
      makeEvent(2, "goal-selected", { countsAsAction: true }),
      makeEvent(3, "click", { countsAsAction: true }),
      makeEvent(3, "click", { countsAsAction: true, label: "duplicate step" }),
      makeEvent(4, "click", { countsAsAction: false }),
      makeEvent(5, "complete", { countsAsAction: true }),
      makeEvent(6, "click", { countsAsAction: true, outcome: "failure" }),
    ];

    const metrics = computeJourneyMetrics(journey({ events }), "join");

    // Non-click events are never actions regardless of their flag, a repeated
    // counted step is counted once, and flagged-out or failed clicks do not
    // count — only the single unique successful click at step 3 does.
    expect(metrics.actionCount).toBe(1);
  });

  test("reports pending with null counts when the journey record is absent", () => {
    const metrics = computeJourneyMetrics(undefined, "join");

    expect(metrics.journeyId).toBeNull();
    expect(metrics.goalId).toBe("join");
    expect(metrics.outcome).toBe("pending");
    expect(metrics.actionCount).toBeNull();
    expect(metrics.navigationEventCount).toBeNull();
    expect(metrics.durationMs).toBeNull();
    expect(metrics.ai).toBeNull();
    expect(metrics.evidence).toEqual({
      traceRecorded: false,
      screenshotCount: 0,
      missingScreenshotIds: [],
      danglingScreenshotIds: [],
      complete: false,
    });
  });

  test("maps failed, blocked and timed-out statuses to their outcomes while keeping real action counts", () => {
    const failed = computeJourneyMetrics(journey({ status: "failed" }), "join");
    const blocked = computeJourneyMetrics(journey({ status: "blocked" }), "join");
    const timedOut = computeJourneyMetrics(
      journey({ status: "timeout" }),
      "join",
    );

    expect(failed.outcome).toBe("failed");
    expect(failed.actionCount).toBe(1);
    expect(blocked.outcome).toBe("blocked");
    expect(blocked.actionCount).toBe(1);
    expect(timedOut.outcome).toBe("timed-out");
    expect(timedOut.actionCount).toBe(1);
  });

  test("returns null duration for missing, invalid or reversed timestamps", () => {
    const valid = computeJourneyMetrics(journey(), "join");
    expect(valid.durationMs).toBe(5000);

    const invalid = computeJourneyMetrics(
      { ...journey(), startedAt: "not-a-date" } as unknown as JourneyRecord,
      "join",
    );
    expect(invalid.durationMs).toBeNull();

    const reversed = computeJourneyMetrics(
      journey({ completedAt: "2026-11-16T09:59:59.000Z" }),
      "join",
    );
    expect(reversed.durationMs).toBeNull();

    const missing = computeJourneyMetrics(
      {
        ...journey(),
        startedAt: undefined,
        completedAt: undefined,
      } as unknown as JourneyRecord,
      "join",
    );
    expect(missing.durationMs).toBeNull();
  });

  test("returns null ai block when the record has no model metadata", () => {
    expect(computeJourneyMetrics(journey(), "join").ai).toBeNull();

    const summary: AiJourneySummary = {
      provider: "nebius",
      model: "zai-org/GLM-5.3-Flash",
      promptVersion: "p1",
      inferenceCalls: 4,
      inputTokens: 4800,
      outputTokens: 240,
      rejectedProposals: 1,
      modelErrors: [],
    };

    expect(
      computeJourneyMetrics(journey({ ai: summary }), "join").ai,
    ).toEqual({
      inferenceCalls: 4,
      inputTokens: 4800,
      outputTokens: 240,
      rejectedProposals: 1,
    });
  });

  test("marks evidence complete only when the trace exists and every screenshot reference resolves", () => {
    const complete = computeJourneyMetrics(journey(), "join");
    expect(complete.evidence).toEqual({
      traceRecorded: true,
      screenshotCount: 4,
      missingScreenshotIds: [],
      danglingScreenshotIds: [],
      complete: true,
    });

    const noTrace = computeJourneyMetrics(journey({ events: [] }), "join");
    expect(noTrace.evidence.traceRecorded).toBe(false);
    expect(noTrace.evidence.complete).toBe(false);
  });

  test("flags dangling and missing screenshot references", () => {
    const events = [
      makeEvent(1, "navigate", { screenshotId: "ghost.png" }),
      makeEvent(2, "goal-selected", { screenshotId: undefined }),
      makeEvent(3, "click", { screenshotId: undefined }),
    ];

    const metrics = computeJourneyMetrics(
      journey({ events, screenshots: [] }),
      "join",
    );

    expect(metrics.evidence.danglingScreenshotIds).toEqual(["ghost.png"]);
    expect(metrics.evidence.missingScreenshotIds).toEqual([
      "step-2",
      "step-3",
    ]);
    expect(metrics.evidence.complete).toBe(false);
  });

  test("rejects malformed metrics at the schema boundary", () => {
    const parsed = journeyMetricsSchema.parse(
      computeJourneyMetrics(journey(), "join"),
    );
    expect(parsed.goalId).toBe("join");

    expect(
      journeyMetricsSchema.safeParse({
        ...computeJourneyMetrics(journey(), "join"),
        actionCount: -1,
      }).success,
    ).toBe(false);
    expect(
      journeyMetricsSchema.safeParse({
        ...computeJourneyMetrics(journey(), "join"),
        outcome: "unknown",
      }).success,
    ).toBe(false);
  });
});
