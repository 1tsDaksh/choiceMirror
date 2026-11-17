import type { JourneyRecord, TraceEvent } from "@choicemirror/contracts";

/**
 * A user's evidence selection in the mirrored dashboard. At least one of
 * `stepNo` / `screenshotId` is non-null — build selections only through
 * `selectEvent` / `selectScreenshot`.
 */
export type EventSelection = {
  journeyIndex: 0 | 1;
  stepNo: number | null;
  screenshotId: string | null;
};

export function selectEvent(
  journeyIndex: 0 | 1,
  event: TraceEvent,
): EventSelection {
  return {
    journeyIndex,
    stepNo: event.stepNo,
    screenshotId: event.screenshotId ?? null,
  };
}

export function selectScreenshot(
  journeyIndex: 0 | 1,
  screenshotId: string,
): EventSelection {
  return { journeyIndex, stepNo: null, screenshotId };
}

export type ResolvedSelection = {
  journey: JourneyRecord;
  event: TraceEvent | null;
  screenshotId: string | null;
};

/**
 * Resolves a selection against stored evidence: by `stepNo` first, then by
 * `screenshotId` reverse-lookup. Returns null when the selection cannot be
 * resolved (empty slot, or a step that disappeared after a refresh) — the
 * caller must show an empty state, never wrong evidence.
 */
export function resolveSelection(
  journeys: readonly (JourneyRecord | undefined)[],
  selection: EventSelection | null,
): ResolvedSelection | null {
  if (!selection) {
    return null;
  }
  const journey = journeys[selection.journeyIndex];
  if (!journey) {
    return null;
  }

  if (selection.stepNo !== null) {
    const stepNo = selection.stepNo;
    const event =
      journey.events.find((candidate) => candidate.stepNo === stepNo) ?? null;
    if (!event) {
      return null;
    }
    return {
      journey,
      event,
      screenshotId: event.screenshotId ?? selection.screenshotId ?? null,
    };
  }

  if (selection.screenshotId !== null) {
    const screenshotId = selection.screenshotId;
    const stored = journey.screenshots.some(
      (screenshot) => screenshot.id === screenshotId,
    );
    if (!stored) {
      return null;
    }
    const event =
      journey.events.find(
        (candidate) => candidate.screenshotId === screenshotId,
      ) ?? null;
    return { journey, event, screenshotId };
  }

  return null;
}
