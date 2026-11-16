import type { ComparisonDetail } from "@choicemirror/contracts";

import type { Finding, ValidationResult } from "./schemas";

/**
 * Verifies every evidence reference in the supplied findings against the
 * stored detail: journey ids must exist, cited steps must exist in that
 * journey's events, and cited screenshots must be stored artifacts.
 */
export function validateFindings(
  detail: ComparisonDetail,
  findings: readonly Finding[],
): ValidationResult {
  const problems: string[] = [];
  const journeysById = new Map(
    detail.journeys.map((journey) => [journey.id, journey]),
  );

  for (const finding of findings) {
    for (const entry of finding.evidence) {
      const journey = journeysById.get(entry.journeyId);
      if (!journey) {
        problems.push(
          `Finding ${finding.id} references unknown journey ${entry.journeyId}.`,
        );
        continue;
      }
      const stepNos = new Set(journey.events.map((event) => event.stepNo));
      for (const stepNo of entry.stepNos) {
        if (!stepNos.has(stepNo)) {
          problems.push(
            `Finding ${finding.id} references unknown step ${stepNo} in journey ${entry.journeyId}.`,
          );
        }
      }
      const screenshotIds = new Set(
        journey.screenshots.map((screenshot) => screenshot.id),
      );
      for (const screenshotId of entry.screenshotIds) {
        if (!screenshotIds.has(screenshotId)) {
          problems.push(
            `Finding ${finding.id} references unknown screenshot ${screenshotId} in journey ${entry.journeyId}.`,
          );
        }
      }
    }
  }

  return { valid: problems.length === 0, problems };
}
