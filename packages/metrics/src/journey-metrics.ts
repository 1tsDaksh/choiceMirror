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
 * The single definition of a counted action: a successful click event the
 * runner flagged as work the user did. Goal selection, navigation and
 * completion are evidence, never actions — whatever their flag says.
 */
export function isCountedAction(event: TraceEvent): boolean {
  return (
    event.type === "click" &&
    event.countsAsAction &&
    event.outcome === "success"
  );
}

/**
 * Counted actions in trace order, deduplicated by step number so a repeated
 * step reference can never inflate a journey's action count.
 */
export function countedActionEvents(
  events: readonly TraceEvent[],
): TraceEvent[] {
  const seenSteps = new Set<number>();
  const counted: TraceEvent[] = [];
  for (const event of events) {
    if (isCountedAction(event) && !seenSteps.has(event.stepNo)) {
      seenSteps.add(event.stepNo);
      counted.push(event);
    }
  }
  return counted;
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
    actionCount: traceRecorded ? countedActionEvents(events).length : null,
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
