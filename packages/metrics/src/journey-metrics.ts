import type { JourneyRecord, TraceEvent } from "@choicemirror/contracts";

import type { JourneyMetrics, JourneyOutcome } from "./schemas";

/** Event types the runner checkpoints with a screenshot on success. */
const SCREENSHOT_REQUIRED_TYPES: ReadonlySet<TraceEvent["type"]> = new Set([
  "navigate",
  "goal-selected",
  "click",
  "complete",
]);

const STATUS_OUTCOMES: Record<JourneyRecord["status"], JourneyOutcome> = {
  completed: "completed",
  failed: "failed",
  blocked: "blocked",
  timeout: "timed-out",
};

function computeDurationMs(journey: JourneyRecord): number | null {
  const started = Date.parse(journey.startedAt ?? "");
  const completed = Date.parse(journey.completedAt ?? "");
  if (Number.isNaN(started) || Number.isNaN(completed)) {
    return null;
  }
  if (completed < started) {
    return null;
  }
  return completed - started;
}

/**
 * Pure, deterministic metrics for one journey, derived only from its stored
 * evidence. An absent journey is `pending` with null counts — never zero.
 */
export function computeJourneyMetrics(
  journey: JourneyRecord | undefined,
  goalId: JourneyRecord["goalId"],
): JourneyMetrics {
  if (!journey) {
    return {
      journeyId: null,
      goalId,
      outcome: "pending",
      actionCount: null,
      navigationEventCount: null,
      durationMs: null,
      ai: null,
      evidence: {
        traceRecorded: false,
        screenshotCount: 0,
        missingScreenshotIds: [],
        danglingScreenshotIds: [],
        complete: false,
      },
    };
  }

  const events = journey.events;
  const traceRecorded = events.length > 0;
  const screenshots = journey.screenshots;
  const storedScreenshotIds = new Set(
    screenshots.map((screenshot) => screenshot.id),
  );

  const danglingScreenshotIds: string[] = [];
  const seenDangling = new Set<string>();
  const missingScreenshotIds: string[] = [];
  for (const event of events) {
    if (
      event.screenshotId !== undefined &&
      !storedScreenshotIds.has(event.screenshotId) &&
      !seenDangling.has(event.screenshotId)
    ) {
      seenDangling.add(event.screenshotId);
      danglingScreenshotIds.push(event.screenshotId);
    }
    if (
      event.outcome === "success" &&
      event.screenshotId === undefined &&
      SCREENSHOT_REQUIRED_TYPES.has(event.type)
    ) {
      const marker = `step-${event.stepNo}`;
      if (!missingScreenshotIds.includes(marker)) {
        missingScreenshotIds.push(marker);
      }
    }
  }

  return {
    journeyId: journey.id,
    goalId: journey.goalId,
    outcome: STATUS_OUTCOMES[journey.status],
    actionCount: traceRecorded
      ? events.filter(
          (event) => event.countsAsAction && event.outcome === "success",
        ).length
      : null,
    navigationEventCount: traceRecorded
      ? events.filter((event) => event.type === "navigate").length
      : null,
    durationMs: computeDurationMs(journey),
    ai: journey.ai
      ? {
          inferenceCalls: journey.ai.inferenceCalls,
          inputTokens: journey.ai.inputTokens,
          outputTokens: journey.ai.outputTokens,
          rejectedProposals: journey.ai.rejectedProposals,
        }
      : null,
    evidence: {
      traceRecorded,
      screenshotCount: screenshots.length,
      missingScreenshotIds,
      danglingScreenshotIds,
      complete:
        traceRecorded &&
        danglingScreenshotIds.length === 0 &&
        missingScreenshotIds.length === 0,
    },
  };
}
