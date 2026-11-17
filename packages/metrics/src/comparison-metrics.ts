import type { ComparisonRecord, JourneyRecord } from "@choicemirror/contracts";

import { computeJourneyMetrics } from "./journey-metrics";
import type {
  ComparisonMetrics,
  ComparisonResult,
  JourneyMetrics,
} from "./schemas";

function journeyLabel(index: 0 | 1, goalId: string): string {
  return `Journey ${index === 0 ? "A" : "B"} (${goalId})`;
}

function effectiveMode(
  journey: JourneyRecord | undefined,
): "deterministic" | "ai" {
  // Phase 2 records predate `mode`; they ran deterministically.
  return journey?.mode ?? "deterministic";
}

/**
 * Pure, deterministic paired metrics. Journeys are mapped onto
 * `comparison.goalIds` — the stored array order is not goal order. Numeric
 * differences exist only when both journeys completed with recorded counts
 * under matching conditions (no comparability reasons); otherwise the
 * result is `inconclusive` with human-readable reasons while each journey
 * keeps its own recorded count.
 */
export function computeComparisonMetrics(input: {
  comparison: ComparisonRecord;
  journeys: readonly JourneyRecord[];
}): ComparisonMetrics {
  const { comparison, journeys } = input;

  const records = comparison.goalIds.map((goalId) =>
    journeys.find((journey) => journey.goalId === goalId),
  );
  const [recordA, recordB] = records;
  const journeyMetrics: [JourneyMetrics, JourneyMetrics] = [
    computeJourneyMetrics(recordA, comparison.goalIds[0]),
    computeJourneyMetrics(recordB, comparison.goalIds[1]),
  ];

  const reasons: string[] = [];
  for (const index of [0, 1] as const) {
    const record = records[index];
    const slotMetrics = journeyMetrics[index];
    const label = journeyLabel(index, comparison.goalIds[index]);
    if (!record) {
      reasons.push(`${label} has no recorded evidence yet.`);
      continue;
    }
    if (slotMetrics.outcome !== "completed") {
      reasons.push(`${label} did not complete (${record.status}).`);
    } else if (slotMetrics.actionCount === null) {
      reasons.push(`${label} recorded no action events.`);
    }
  }

  if (recordA && recordB) {
    if (recordA.seed !== recordB.seed) {
      reasons.push("Seeds differ between journeys.");
    }
    if (recordA.origin !== recordB.origin) {
      reasons.push("Origins differ between journeys.");
    }
    if (
      recordA.viewport.width !== recordB.viewport.width ||
      recordA.viewport.height !== recordB.viewport.height
    ) {
      reasons.push("Viewports differ between journeys.");
    }
    if (effectiveMode(recordA) !== effectiveMode(recordB)) {
      reasons.push("Execution modes differ between journeys.");
    }
  }

  const bothCompleted =
    journeyMetrics[0].outcome === "completed" &&
    journeyMetrics[1].outcome === "completed";
  const countA = journeyMetrics[0].actionCount;
  const countB = journeyMetrics[1].actionCount;

  let actionDifference: number | null = null;
  let heavierJourney: "a" | "b" | null = null;
  let actionRatio: number | null = null;
  // A difference measured across mismatched conditions would contradict the
  // inconclusive result, so the comparative numbers are withheld entirely.
  if (
    bothCompleted &&
    countA !== null &&
    countB !== null &&
    reasons.length === 0
  ) {
    actionDifference = Math.abs(countA - countB);
    heavierJourney =
      countA > countB ? "a" : countB > countA ? "b" : null;
    actionRatio =
      (Math.max(countA, countB) + 1) / (Math.min(countA, countB) + 1);
  }

  let result: ComparisonResult = "inconclusive";
  if (bothCompleted && actionDifference !== null && reasons.length === 0) {
    result = actionDifference === 0 ? "balanced" : "observed-asymmetry";
  }

  return {
    comparisonId: comparison.id,
    status: comparison.status,
    journeys: journeyMetrics,
    actionDifference,
    heavierJourney,
    actionRatio,
    comparableConditions: {
      comparable: reasons.length === 0,
      reasons,
    },
    result,
  };
}
