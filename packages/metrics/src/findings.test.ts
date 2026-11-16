import { describe, expect, test } from "vitest";

import type {
  AiJourneySummary,
  ComparisonRecord,
  JourneyRecord,
  TraceEvent,
} from "@choicemirror/contracts";

import { computeComparisonMetrics } from "./comparison-metrics";
import { buildFindings } from "./findings";

const VERDICT_LANGUAGE =
  /manipulat|dark pattern|unlawful|illegal|scam|fraud|decept|deliberate|intentional/i;

const DISCLAIMER =
  "Action differences are descriptive measurements, not proof of unlawful or intentional manipulation.";

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
  ai?: AiJourneySummary;
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
    ai,
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
    ...(ai !== undefined ? { ai } : {}),
    ...(status === "failed" ? { error: "journey failed" } : {}),
  };
}

type CaseKind = "asymmetry" | "balanced" | "failed" | "missing";

function buildCase(kind: CaseKind) {
  const fixtures: Record<CaseKind, JourneyRecord[]> = {
    asymmetry: [journey("join", { actions: 1 }), journey("leave", { actions: 3 })],
    balanced: [journey("join", { actions: 1 }), journey("leave", { actions: 1 })],
    failed: [
      journey("join", { actions: 1 }),
      journey("leave", { actions: 3, status: "failed" }),
    ],
    missing: [journey("join", { actions: 1 })],
  };
  const journeys = fixtures[kind];
  const metrics = computeComparisonMetrics({
    comparison: comparison(kind === "failed" ? { status: "failed" } : {}),
    journeys,
  });
  const findings = buildFindings(metrics, journeys);
  const finding = findings[0];
  if (!finding) {
    throw new Error("expected exactly one finding");
  }
  return { metrics, journeys, findings, finding };
}

describe("buildFindings", () => {
  test("builds an asymmetry finding with the spec headline and supporting description", () => {
    const { finding } = buildCase("asymmetry");

    expect(finding.id).toBe("cmp_ab12cd34ef567890-action-asymmetry");
    expect(finding.category).toBe("action-asymmetry");
    expect(finding.quality).toBe("evidence-complete");
    expect(finding.title).toBe("Leaving required 2 more actions than joining");
    expect(finding.explanation).toBe(
      "Both journeys completed successfully in the controlled benchmark. The leaving journey required three recorded actions, compared with one for joining.",
    );
    expect(finding.observed).toEqual([
      "Goal A (join): completed with 1 recorded action.",
      "Goal B (leave): completed with 3 recorded actions.",
    ]);
    expect(finding.calculated).toContain("Action difference: 2 (3 - 1).");
    expect(finding.calculated).toContain(
      "Action burden ratio: (3+1)/(1+1) = 2.",
    );
    expect(finding.interpreted).toBe(
      "This run recorded a 2-action gap between the two goals; the evidence does not explain why the gap exists.",
    );
    expect(finding.evidence).toEqual([
      {
        journeyId: "cmp_ab12cd34ef567890-join",
        stepNos: [3],
        screenshotIds: ["shot-3.png"],
      },
      {
        journeyId: "cmp_ab12cd34ef567890-leave",
        stepNos: [3, 4, 5],
        screenshotIds: ["shot-3.png", "shot-4.png", "shot-5.png"],
      },
    ]);
  });

  test("builds a balanced finding for equal counts", () => {
    const { finding } = buildCase("balanced");

    expect(finding.category).toBe("balanced-actions");
    expect(finding.title).toBe("Equal recorded action burden");
    expect(finding.explanation).toBe(
      "Both journeys completed successfully in the controlled benchmark with the same number of recorded actions (one each).",
    );
    expect(finding.calculated).toContain("Action difference: 0.");
    expect(finding.calculated).toContain(
      "Action burden ratio: (1+1)/(1+1) = 1.",
    );
    expect(finding.quality).toBe("evidence-complete");
  });

  test("builds an inconclusive finding with no numeric claims when a journey failed", () => {
    const { finding } = buildCase("failed");

    expect(finding.id).toBe("cmp_ab12cd34ef567890-inconclusive");
    expect(finding.category).toBe("inconclusive");
    expect(finding.title).toBe("Inconclusive comparison");
    expect(finding.explanation).toBe(
      "Journey B (leave) did not complete (failed), so action counts cannot be compared.",
    );
    expect(finding.calculated).toEqual([]);
    expect(finding.quality).toBe("insufficient-evidence");
    // The failed journey still has real trace events, so it is cited.
    expect(finding.evidence.map((entry) => entry.journeyId)).toEqual([
      "cmp_ab12cd34ef567890-join",
      "cmp_ab12cd34ef567890-leave",
    ]);
  });

  test("builds an inconclusive finding when a journey has no records", () => {
    const { finding } = buildCase("missing");

    expect(finding.category).toBe("inconclusive");
    expect(finding.explanation).toBe(
      "Journey B (leave) has no recorded evidence yet, so action counts cannot be compared.",
    );
    expect(finding.calculated).toEqual([]);
    expect(finding.quality).toBe("insufficient-evidence");
    expect(finding.evidence.map((entry) => entry.journeyId)).toEqual([
      "cmp_ab12cd34ef567890-join",
    ]);
    expect(finding.observed).toContain(
      "Goal B (leave): no recorded evidence yet.",
    );
  });

  test("never emits verdict language in title explanation observed calculated or interpreted", () => {
    for (const kind of ["asymmetry", "balanced", "failed", "missing"] as const) {
      const { finding } = buildCase(kind);
      const text = [
        finding.title,
        finding.explanation,
        ...finding.observed,
        ...finding.calculated,
        finding.interpreted,
      ].join(" ");
      expect(text, kind).not.toMatch(VERDICT_LANGUAGE);
    }
  });

  test("every finding carries the standard disclaimer limitation", () => {
    for (const kind of ["asymmetry", "balanced", "failed", "missing"] as const) {
      const { finding } = buildCase(kind);
      expect(finding.limitations, kind).toContain(DISCLAIMER);
      expect(finding.limitations, kind).toContain(
        "Single run against the controlled local benchmark; results describe this execution only.",
      );
      expect(finding.limitations, kind).toContain(
        "Counts reflect recorded browser actions; backtracking, interruptions and dead ends are not captured by the trace format.",
      );
      expect(finding.limitations, kind).not.toContain(
        "Model-reported justifications are recorded as reported, not independently verified.",
      );
    }
  });

  test("adds the model-reporting limitation only when ai metadata exists", () => {
    const summary: AiJourneySummary = {
      provider: "nebius",
      model: "zai-org/GLM-5.3-Flash",
      promptVersion: "p1",
      inferenceCalls: 4,
      inputTokens: 4800,
      outputTokens: 240,
      rejectedProposals: 0,
      modelErrors: [],
    };
    const journeys = [
      journey("join", { actions: 1, ai: summary }),
      journey("leave", { actions: 3 }),
    ];
    const metrics = computeComparisonMetrics({
      comparison: comparison(),
      journeys,
    });
    const findings = buildFindings(metrics, journeys);
    const finding = findings[0];
    if (!finding) {
      throw new Error("expected exactly one finding");
    }

    expect(finding.category).toBe("action-asymmetry");
    expect(finding.limitations).toContain(
      "Model-reported justifications are recorded as reported, not independently verified.",
    );
  });

  test("references only events that exist in the supplied journeys", () => {
    for (const kind of ["asymmetry", "balanced", "failed", "missing"] as const) {
      const { journeys, finding } = buildCase(kind);
      for (const entry of finding.evidence) {
        const journeyRecord = journeys.find(
          (candidate) => candidate.id === entry.journeyId,
        );
        expect(journeyRecord, `${kind}:${entry.journeyId}`).toBeDefined();
        const eventStepNos = new Set(
          journeyRecord?.events.map((event) => event.stepNo),
        );
        for (const stepNo of entry.stepNos) {
          expect(eventStepNos.has(stepNo), `${kind}:step ${stepNo}`).toBe(true);
        }
        const screenshotIds = new Set(
          journeyRecord?.screenshots.map((screenshot) => screenshot.id),
        );
        for (const screenshotId of entry.screenshotIds) {
          expect(
            screenshotIds.has(screenshotId),
            `${kind}:${screenshotId}`,
          ).toBe(true);
        }
      }
    }
  });

  test("always returns exactly one finding", () => {
    for (const kind of ["asymmetry", "balanced", "failed", "missing"] as const) {
      const { findings } = buildCase(kind);
      expect(findings, kind).toHaveLength(1);
    }
  });
});
