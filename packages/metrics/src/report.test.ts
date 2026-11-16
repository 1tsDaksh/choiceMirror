import { describe, expect, test } from "vitest";

import type {
  ComparisonDetail,
  ComparisonRecord,
  JourneyRecord,
  TraceEvent,
} from "@choicemirror/contracts";

import { buildComparisonReport, degradeReport } from "./report";
import { comparisonReportSchema } from "./schemas";

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

describe("buildComparisonReport", () => {
  test("produces metrics findings and valid validation for a completed detail", () => {
    const report = buildComparisonReport(buildDetail());

    expect(report.metrics.result).toBe("observed-asymmetry");
    expect(report.metrics.actionDifference).toBe(2);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.category).toBe("action-asymmetry");
    expect(report.validation).toEqual({ valid: true, problems: [] });
  });

  test("degrades to a single insufficient-evidence finding when validation fails", () => {
    const detail = buildDetail();
    const problems = [
      "Finding cmp_ab12cd34ef567890-action-asymmetry references unknown journey cmp_0000000000000000-join.",
    ];

    const report = degradeReport(detail, problems);

    expect(report.validation).toEqual({ valid: false, problems });
    expect(report.findings).toHaveLength(1);
    const finding = report.findings[0];
    if (!finding) {
      throw new Error("expected one finding");
    }
    expect(finding.id).toBe("cmp_ab12cd34ef567890-evidence-invalid");
    expect(finding.title).toBe("Evidence could not be validated");
    expect(finding.quality).toBe("insufficient-evidence");
    expect(finding.category).toBe("inconclusive");
    // The detail itself is parseable, so its metrics are kept.
    expect(report.metrics.result).toBe("observed-asymmetry");
    expect(comparisonReportSchema.parse(report)).toEqual(report);
  });

  test("returns a degraded report when the detail itself fails schema validation", () => {
    const detail = buildDetail();
    const corrupt: ComparisonDetail = {
      ...detail,
      journeys: [
        { ...detail.journeys[0], events: "nope" } as unknown as JourneyRecord,
        detail.journeys[1],
      ].filter((journeyRecord): journeyRecord is JourneyRecord =>
        Boolean(journeyRecord),
      ),
    };

    const report = buildComparisonReport(corrupt);

    expect(report.validation.valid).toBe(false);
    expect(report.validation.problems).toEqual([
      "Stored evidence failed schema validation.",
    ]);
    expect(report.findings).toHaveLength(1);
    const finding = report.findings[0];
    if (!finding) {
      throw new Error("expected one finding");
    }
    expect(finding.id).toBe("cmp_ab12cd34ef567890-evidence-invalid");
    expect(finding.title).toBe("Evidence could not be validated");
    expect(finding.quality).toBe("insufficient-evidence");
    expect(report.metrics.result).toBe("inconclusive");
    expect(comparisonReportSchema.parse(report)).toEqual(report);
  });

  test("report schema round-trips a healthy report", () => {
    const report = buildComparisonReport(buildDetail());

    expect(comparisonReportSchema.parse(report)).toEqual(report);
  });
});
