import {
  comparisonDetailSchema,
  type ComparisonDetail,
} from "@choicemirror/contracts";

import { computeComparisonMetrics } from "./comparison-metrics";
import { validateFindings } from "./evidence-validation";
import { buildFindings, standardLimitations } from "./findings";
import { computeJourneyMetrics } from "./journey-metrics";
import type {
  ComparisonMetrics,
  ComparisonReport,
  Finding,
} from "./schemas";
import { comparisonMetricsSchema } from "./schemas";

function fallbackMetrics(detail: ComparisonDetail): ComparisonMetrics {
  const goalIds = detail.comparison.goalIds;
  return {
    comparisonId: detail.comparison.id,
    status: detail.comparison.status,
    journeys: [
      computeJourneyMetrics(undefined, goalIds[0]),
      computeJourneyMetrics(undefined, goalIds[1]),
    ],
    actionDifference: null,
    heavierJourney: null,
    actionRatio: null,
    comparableConditions: {
      comparable: false,
      reasons: [
        `Journey A (${goalIds[0]}) has no recorded evidence yet.`,
        `Journey B (${goalIds[1]}) has no recorded evidence yet.`,
      ],
    },
    result: "inconclusive",
  };
}

function safeMetrics(detail: ComparisonDetail): ComparisonMetrics {
  try {
    const metrics = computeComparisonMetrics({
      comparison: detail.comparison,
      journeys: detail.journeys,
    });
    const parsed = comparisonMetricsSchema.safeParse(metrics);
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Corrupt journey data — fall through to pending-only metrics.
  }
  return fallbackMetrics(detail);
}

/**
 * Degrades to a report with one insufficient-evidence finding. Keeps the
 * computed metrics when the detail is still parseable; otherwise both
 * journey slots are reported as pending. Always schema-valid.
 */
export function degradeReport(
  detail: ComparisonDetail,
  problems: string[],
): ComparisonReport {
  const finding: Finding = {
    id: `${detail.comparison.id}-evidence-invalid`,
    category: "inconclusive",
    title: "Evidence could not be validated",
    explanation: "Stored evidence failed validation, so no findings are reported.",
    observed: [],
    calculated: [],
    interpreted: "No interpretation is offered.",
    evidence: [],
    limitations: standardLimitations(false),
    quality: "insufficient-evidence",
  };

  return {
    metrics: safeMetrics(detail),
    findings: [finding],
    validation: { valid: false, problems },
  };
}

/**
 * Entry point for the dashboard: derives a schema-valid report from stored
 * evidence on every call. No persistence, no model call. Corruption degrades
 * to a single insufficient-evidence finding — never fabricated references.
 */
export function buildComparisonReport(detail: ComparisonDetail): ComparisonReport {
  const parsed = comparisonDetailSchema.safeParse(detail);
  if (!parsed.success) {
    return degradeReport(detail, ["Stored evidence failed schema validation."]);
  }

  const validDetail = parsed.data;
  const metrics = computeComparisonMetrics({
    comparison: validDetail.comparison,
    journeys: validDetail.journeys,
  });
  const findings = buildFindings(metrics, validDetail.journeys);
  const validation = validateFindings(validDetail, findings);
  if (!validation.valid) {
    return degradeReport(detail, validation.problems);
  }

  return { metrics, findings, validation };
}
