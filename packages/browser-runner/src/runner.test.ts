import { buildJourneyPlan, getScenario } from "@choicemirror/contracts";
import { describe, expect, it } from "vitest";

import type { JourneyDriver, OpenJourney } from "./runner";
import { runJourney } from "./runner";

const comparisonId = "cmp_ab12cd34ef567890";
const origin = "http://localhost:3001";

function leavePlan() {
  const scenario = getScenario("membership-asymmetric");
  expect(scenario).toBeDefined();
  const plan = buildJourneyPlan(scenario!, "leave");
  expect(plan).toBeDefined();
  return plan!;
}

type FakeScript = {
  failOn?: "navigate" | "selectGoal" | "clickAction" | "assertCompleted";
  hangOn?: "clickAction";
  currentUrlOverride?: string;
};

function fakeOpen(script: FakeScript): {
  open: OpenJourney;
  closeCount: () => number;
  clicked: string[];
} {
  let closes = 0;
  let url = "";
  const clicked: string[] = [];

  const open: OpenJourney = async () => {
    const driver: JourneyDriver = {
      async navigate(target) {
        if (script.failOn === "navigate") {
          throw new Error("navigate exploded");
        }
        url = script.currentUrlOverride ?? target;
      },
      async selectGoal() {
        if (script.failOn === "selectGoal") {
          throw new Error("goal exploded");
        }
      },
      async clickAction(name) {
        if (script.hangOn === "clickAction") {
          return new Promise<void>(() => {});
        }
        if (script.failOn === "clickAction") {
          throw new Error("click exploded");
        }
        clicked.push(name);
      },
      async assertCompleted() {
        if (script.failOn === "assertCompleted") {
          throw new Error("assert exploded");
        }
      },
      async screenshot() {
        return Buffer.from([137, 80, 78, 71]);
      },
      async currentUrl() {
        return url;
      },
    };

    return {
      driver,
      close: async () => {
        closes += 1;
      },
    };
  };

  return { open, closeCount: () => closes, clicked };
}

describe("runJourney", () => {
  it("completes the asymmetric leave journey with ordered events and checkpoints", async () => {
    const fake = fakeOpen({});

    const result = await runJourney({
      comparisonId,
      plan: leavePlan(),
      origin,
      seed: "phase-2",
      openJourney: fake.open,
    });

    expect(result.status).toBe("completed");
    expect(result.actionCount).toBe(3);
    expect(fake.clicked).toEqual([
      "Review the leaving notice",
      "Confirm the membership choice",
      "Leave workspace",
    ]);

    expect(result.events.map((event) => event.type)).toEqual([
      "navigate",
      "goal-selected",
      "click",
      "click",
      "click",
      "complete",
    ]);
    expect(result.events.map((event) => event.stepNo)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const event of result.events) {
      expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);
    }

    const journeyId = `${comparisonId}-leave`;
    expect(result.screenshots.map((shot) => shot.id)).toEqual([
      `${journeyId}-start.png`,
      `${journeyId}-goal.png`,
      `${journeyId}-step-1.png`,
      `${journeyId}-step-2.png`,
      `${journeyId}-step-3.png`,
      `${journeyId}-complete.png`,
    ]);
    expect(result.screenshots.map((shot) => shot.label)).toEqual([
      "Starting state",
      "After goal selection",
      "After action 1",
      "After action 2",
      "After action 3",
      "Completed state",
    ]);
    expect(result.error).toBeUndefined();
    expect(fake.closeCount()).toBe(1);
  });

  it("closes the browser when a step fails", async () => {
    const fake = fakeOpen({ failOn: "clickAction" });

    const result = await runJourney({
      comparisonId,
      plan: leavePlan(),
      origin,
      seed: "phase-2",
      openJourney: fake.open,
    });

    expect(result.status).toBe("failed");
    expect(result.error).toBeDefined();
    const last = result.events.at(-1);
    expect(last?.type).toBe("error");
    expect(last?.outcome).toBe("failure");
    expect(fake.closeCount()).toBe(1);
  });

  it("closes the browser when a step times out", async () => {
    const fake = fakeOpen({ hangOn: "clickAction" });

    const result = await runJourney({
      comparisonId,
      plan: leavePlan(),
      origin,
      seed: "phase-2",
      openJourney: fake.open,
      stepTimeoutMs: 20,
    });

    expect(result.status).toBe("timeout");
    expect(fake.closeCount()).toBe(1);
  });

  it("blocks navigation that lands off-origin", async () => {
    const fake = fakeOpen({ currentUrlOverride: "https://evil.example/" });

    const result = await runJourney({
      comparisonId,
      plan: leavePlan(),
      origin,
      seed: "phase-2",
      openJourney: fake.open,
    });

    expect(result.status).toBe("blocked");
    expect(result.error).toContain("allowed origin");
    expect(fake.clicked).toEqual([]);
    expect(fake.closeCount()).toBe(1);
  });

  it("blocks a plan that exceeds the action limit without opening a browser", async () => {
    const fake = fakeOpen({});

    const result = await runJourney({
      comparisonId,
      plan: leavePlan(),
      origin,
      seed: "phase-2",
      openJourney: fake.open,
      maxActions: 2,
    });

    expect(result.status).toBe("blocked");
    expect(result.error).toBe("Action limit exceeded.");
    expect(fake.closeCount()).toBe(0);
  });

  it("aborts on the journey time budget", async () => {
    const fake = fakeOpen({ hangOn: "clickAction" });

    const result = await runJourney({
      comparisonId,
      plan: leavePlan(),
      origin,
      seed: "phase-2",
      openJourney: fake.open,
      journeyTimeoutMs: 20,
    });

    expect(result.status).toBe("timeout");
    expect(fake.closeCount()).toBe(1);
  });

  it("never counts goal selection as an action", async () => {
    const fake = fakeOpen({});

    const result = await runJourney({
      comparisonId,
      plan: leavePlan(),
      origin,
      seed: "phase-2",
      openJourney: fake.open,
    });

    const counted = result.events.filter((event) => event.countsAsAction);
    expect(counted).toHaveLength(3);
    expect(
      result.events.find((event) => event.type === "goal-selected")
        ?.countsAsAction,
    ).toBe(false);
  });
});
