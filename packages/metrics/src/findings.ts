import type { JourneyRecord } from "@choicemirror/contracts";

import type {
  ComparisonMetrics,
  Finding,
  FindingEvidence,
  FindingQuality,
  JourneyMetrics,
} from "./schemas";

type GoalId = JourneyRecord["goalId"];

const GERUNDS: Record<GoalId, { lower: string; capitalised: string }> = {
  join: { lower: "joining", capitalised: "Joining" },
  leave: { lower: "leaving", capitalised: "Leaving" },
  accept: { lower: "accepting", capitalised: "Accepting" },
  reject: { lower: "rejecting", capitalised: "Rejecting" },
};

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const OUTCOME_WORDS: Record<JourneyMetrics["outcome"], string> = {
  completed: "completed",
  failed: "failed",
  blocked: "blocked",
  "timed-out": "timed out",
  pending: "no recorded evidence yet",
};

const DISCLAIMER =
  "Action differences are descriptive measurements, not proof of unlawful or intentional manipulation.";
const SINGLE_RUN_LIMITATION =
  "Single run against the controlled local benchmark; results describe this execution only.";
const TRACE_SCOPE_LIMITATION =
  "Counts reflect recorded browser actions; backtracking, interruptions and dead ends are not captured by the trace format.";
const MODEL_LIMITATION =
  "Model-reported justifications are recorded as reported, not independently verified.";

function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

function actionWord(count: number): string {
  return `recorded action${count === 1 ? "" : "s"}`;
}

function standardLimitations(hasAi: boolean): string[] {
  const limitations = [
    DISCLAIMER,
    SINGLE_RUN_LIMITATION,
    TRACE_SCOPE_LIMITATION,
  ];
  if (hasAi) {
    limitations.push(MODEL_LIMITATION);
  }
  return limitations;
}

function slotRecord(
  metrics: ComparisonMetrics,
  journeys: readonly JourneyRecord[],
  index: 0 | 1,
): JourneyRecord | undefined {
  const journeyId = metrics.journeys[index].journeyId;
  if (journeyId === null) {
    return undefined;
  }
  return journeys.find((journey) => journey.id === journeyId);
}

function observedLine(index: 0 | 1, slot: JourneyMetrics): string {
  const letter = index === 0 ? "A" : "B";
  const goalId = slot.goalId;
  if (slot.outcome === "pending") {
    return `Goal ${letter} (${goalId}): no recorded evidence yet.`;
  }
  const count =
    slot.actionCount === null
      ? "no recorded actions"
      : `${slot.actionCount} ${actionWord(slot.actionCount)}`;
  return `Goal ${letter} (${goalId}): ${OUTCOME_WORDS[slot.outcome]} with ${count}.`;
}

/**
 * Cites the counted-action events of one recorded journey. Only events that
 * exist in the supplied record are referenced; a journey with no counted
 * actions contributes no evidence entry.
 */
function citeJourney(journey: JourneyRecord): FindingEvidence | null {
  const counted = journey.events.filter(
    (event) => event.countsAsAction && event.outcome === "success",
  );
  if (counted.length === 0) {
    return null;
  }
  return {
    journeyId: journey.id,
    stepNos: counted.map((event) => event.stepNo),
    screenshotIds: counted
      .map((event) => event.screenshotId)
      .filter((id): id is string => id !== undefined),
  };
}

function evidenceQuality(
  metrics: ComparisonMetrics,
  records: Array<JourneyRecord | undefined>,
): FindingQuality {
  const complete =
    records.every((record) => record !== undefined) &&
    metrics.journeys.every((slot) => slot.evidence.complete);
  return complete ? "evidence-complete" : "evidence-partial";
}

function inconclusiveFinding(
  metrics: ComparisonMetrics,
  journeys: readonly JourneyRecord[],
): Finding {
  const reasons = metrics.comparableConditions.reasons;
  const firstReason =
    reasons[0] ?? "Stored evidence does not allow a comparison of recorded actions";
  const explanation = `${firstReason.replace(/\.$/, "")}, so action counts cannot be compared.`;
  const hasAi = [0, 1].some(
    (index) => slotRecord(metrics, journeys, index as 0 | 1)?.ai !== undefined,
  );

  const evidence: FindingEvidence[] = [];
  for (const index of [0, 1] as const) {
    const record = slotRecord(metrics, journeys, index);
    if (record) {
      const citation = citeJourney(record);
      if (citation) {
        evidence.push(citation);
      }
    }
  }

  return {
    id: `${metrics.comparisonId}-inconclusive`,
    category: "inconclusive",
    title: "Inconclusive comparison",
    explanation,
    observed: [
      observedLine(0, metrics.journeys[0]),
      observedLine(1, metrics.journeys[1]),
    ],
    calculated: [],
    interpreted:
      "The stored records do not support an action-count comparison for this run.",
    evidence,
    limitations: standardLimitations(hasAi),
    quality: "insufficient-evidence",
  };
}

function balancedFinding(
  metrics: ComparisonMetrics,
  journeys: readonly JourneyRecord[],
): Finding {
  const countA = metrics.journeys[0].actionCount ?? 0;
  const records: Array<JourneyRecord | undefined> = [
    slotRecord(metrics, journeys, 0),
    slotRecord(metrics, journeys, 1),
  ];
  const hasAi = records.some((record) => record?.ai !== undefined);

  return {
    id: `${metrics.comparisonId}-balanced-actions`,
    category: "balanced-actions",
    title: "Equal recorded action burden",
    explanation: `Both journeys completed successfully in the controlled benchmark with the same number of recorded actions (${numberWord(countA)} each).`,
    observed: [
      observedLine(0, metrics.journeys[0]),
      observedLine(1, metrics.journeys[1]),
    ],
    calculated: [
      "Action difference: 0.",
      `Action burden ratio: (${countA}+1)/(${countA}+1) = 1.`,
    ],
    interpreted: "This run recorded no action-count gap between the two goals.",
    evidence: records.flatMap((record) =>
      record ? citeJourney(record) ?? [] : [],
    ),
    limitations: standardLimitations(hasAi),
    quality: evidenceQuality(metrics, records),
  };
}

function asymmetryFinding(
  metrics: ComparisonMetrics,
  journeys: readonly JourneyRecord[],
): Finding {
  const heavier = metrics.heavierJourney;
  const heavyIndex: 0 | 1 = heavier === "a" ? 0 : 1;
  const lightIndex: 0 | 1 = heavier === "a" ? 1 : 0;
  const heavySlot = metrics.journeys[heavyIndex];
  const lightSlot = metrics.journeys[lightIndex];
  const heavyCount = heavySlot.actionCount ?? 0;
  const lightCount = lightSlot.actionCount ?? 0;
  const diff = metrics.actionDifference ?? 0;
  const max = Math.max(heavyCount, lightCount);
  const min = Math.min(heavyCount, lightCount);
  const ratioText = String(Number((metrics.actionRatio ?? 1).toFixed(2)));

  const records: Array<JourneyRecord | undefined> = [
    slotRecord(metrics, journeys, 0),
    slotRecord(metrics, journeys, 1),
  ];
  const hasAi = records.some((record) => record?.ai !== undefined);

  return {
    id: `${metrics.comparisonId}-action-asymmetry`,
    category: "action-asymmetry",
    title: `${GERUNDS[heavySlot.goalId].capitalised} required ${diff} more action${diff === 1 ? "" : "s"} than ${GERUNDS[lightSlot.goalId].lower}`,
    explanation: `Both journeys completed successfully in the controlled benchmark. The ${GERUNDS[heavySlot.goalId].lower} journey required ${numberWord(heavyCount)} ${actionWord(heavyCount)}, compared with ${numberWord(lightCount)} for ${GERUNDS[lightSlot.goalId].lower}.`,
    observed: [
      observedLine(0, metrics.journeys[0]),
      observedLine(1, metrics.journeys[1]),
    ],
    calculated: [
      `Action difference: ${diff} (${max} - ${min}).`,
      `Action burden ratio: (${max}+1)/(${min}+1) = ${ratioText}.`,
    ],
    interpreted: `This run recorded a ${diff}-action gap between the two goals; the evidence does not explain why the gap exists.`,
    evidence: records.flatMap((record) =>
      record ? citeJourney(record) ?? [] : [],
    ),
    limitations: standardLimitations(hasAi),
    quality: evidenceQuality(metrics, records),
  };
}

/**
 * Deterministic, evidence-grounded finding for one comparison. Always
 * returns exactly one finding; copy derives from goal ids so the metrics
 * package stays free of catalog data. No model call is involved.
 */
export function buildFindings(
  metrics: ComparisonMetrics,
  journeys: readonly JourneyRecord[],
): Finding[] {
  if (metrics.result === "inconclusive") {
    return [inconclusiveFinding(metrics, journeys)];
  }
  if (metrics.result === "balanced") {
    return [balancedFinding(metrics, journeys)];
  }
  return [asymmetryFinding(metrics, journeys)];
}
