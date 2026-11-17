import { describe, expect, test } from "vitest";

import type {
  ComparisonDetail,
  ComparisonRecord,
  JourneyRecord,
  TraceEvent,
} from "@choicemirror/contracts";

import { computeComparisonMetrics } from "./comparison-metrics";
import { validateFindings } from "./evidence-validation";
import { buildFindings } from "./findings";

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
  actions: number,
): JourneyRecord {
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
    status: "completed",
    seed: "42",
    origin: "http://127.0.0.1:3000",
    viewport: { width: 1280, height: 720 },
    expectedActionCount: actions,
    actionCount: actions,
    startedAt: "2026-11-16T10:00:00.000Z",
    completedAt: "2026-11-16T10:00:05.000Z",
    events,
    screenshots: events
      .filter((event) => event.screenshotId !== undefined)
      .map((event) => ({
        id: event.screenshotId as string,
        label: `Step ${event.stepNo}`,
      })),
  };
}

function buildDetail(): ComparisonDetail {
  return {
    comparison: comparison(),
    journeys: [journey("join", 1), journey("leave", 3)],
  };
}

function builtFindings(detail: ComparisonDetail) {
  const metrics = computeComparisonMetrics(detail);
  return buildFindings(metrics, detail.journeys);
}

describe("validateFindings", () => {
  test("accepts findings built from the same detail", () => {
    const detail = buildDetail();
    const findings = builtFindings(detail);

    expect(validateFindings(detail, findings)).toEqual({
      valid: true,
      problems: [],
    });
  });

  test("rejects findings referencing an unknown journey id", () => {
    const detail = buildDetail();
    const findings = builtFindings(detail).map((finding) => ({
      ...finding,
      evidence: [
        ...finding.evidence,
        {
          journeyId: "cmp_0000000000000000-join",
          stepNos: [99],
          screenshotIds: [],
        },
      ],
    }));

    const result = validateFindings(detail, findings);

    expect(result.valid).toBe(false);
    expect(result.problems).toContain(
      "Finding cmp_ab12cd34ef567890-action-asymmetry references unknown journey cmp_0000000000000000-join.",
    );
  });

  test("rejects findings referencing an unknown step number", () => {
    const detail = buildDetail();
    const findings = builtFindings(detail).map((finding) => ({
      ...finding,
      evidence: [
        ...finding.evidence,
        {
          journeyId: "cmp_ab12cd34ef567890-join",
          stepNos: [99],
          screenshotIds: [],
        },
      ],
    }));

    const result = validateFindings(detail, findings);

    expect(result.valid).toBe(false);
    expect(result.problems).toContain(
      "Finding cmp_ab12cd34ef567890-action-asymmetry references unknown step 99 in journey cmp_ab12cd34ef567890-join.",
    );
  });

  test("rejects findings referencing a screenshot that was never stored", () => {
    const detail = buildDetail();
    const findings = builtFindings(detail).map((finding) => ({
      ...finding,
      evidence: [
        ...finding.evidence,
        {
          journeyId: "cmp_ab12cd34ef567890-join",
          stepNos: [],
          screenshotIds: ["ghost.png"],
        },
      ],
    }));

    const result = validateFindings(detail, findings);

    expect(result.valid).toBe(false);
    expect(result.problems).toContain(
      "Finding cmp_ab12cd34ef567890-action-asymmetry references unknown screenshot ghost.png in journey cmp_ab12cd34ef567890-join.",
    );
  });
});
