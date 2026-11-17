import { describe, expect, test } from "vitest";

import type { JourneyRecord, TraceEvent } from "@choicemirror/contracts";

import { resolveSelection, selectEvent, selectScreenshot } from "./selection";

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

const joinJourney = journey("join", 1);
const leaveJourney = journey("leave", 3);
const journeys = [joinJourney, leaveJourney];

describe("resolveSelection", () => {
  test("resolves a valid step selection to its journey and event", () => {
    const clickEvent = joinJourney.events.find(
      (event) => event.stepNo === 3,
    ) as TraceEvent;

    const resolved = resolveSelection(journeys, selectEvent(0, clickEvent));

    expect(resolved?.journey.id).toBe("cmp_ab12cd34ef567890-join");
    expect(resolved?.event?.stepNo).toBe(3);
    expect(resolved?.screenshotId).toBe("shot-3.png");
  });

  test("falls back to screenshot id when stepNo is null", () => {
    const resolved = resolveSelection(
      journeys,
      selectScreenshot(1, "shot-3.png"),
    );

    expect(resolved?.journey.id).toBe("cmp_ab12cd34ef567890-leave");
    expect(resolved?.event?.stepNo).toBe(3);
    expect(resolved?.screenshotId).toBe("shot-3.png");
  });

  test("returns null for a null selection", () => {
    expect(resolveSelection(journeys, null)).toBeNull();
  });

  test("returns null when the step no longer exists after a refresh", () => {
    const resolved = resolveSelection(journeys, {
      journeyIndex: 0,
      stepNo: 99,
      screenshotId: null,
    });

    expect(resolved).toBeNull();
  });

  test("returns null when the journey slot is empty", () => {
    const resolved = resolveSelection(
      [joinJourney, undefined],
      selectEvent(1, leaveJourney.events[2] as TraceEvent),
    );

    expect(resolved).toBeNull();
  });
});
