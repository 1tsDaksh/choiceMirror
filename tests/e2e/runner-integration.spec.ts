import {
  buildJourneyPlan,
  getScenario,
  type JourneyPlan,
} from "@choicemirror/contracts";
import { expect, test } from "@playwright/test";

import { runJourney } from "@choicemirror/browser-runner";

const BENCHMARK_ORIGIN = "http://localhost:3001";
const comparisonId = "cmp_0123456789abcdef";
const PNG_MAGIC = [137, 80, 78, 71];

function planFor(scenarioId: string, goalId: "join" | "leave" | "accept" | "reject"): JourneyPlan {
  const scenario = getScenario(scenarioId);
  expect(scenario, scenarioId).toBeDefined();
  const plan = buildJourneyPlan(scenario!, goalId);
  expect(plan, `${scenarioId}/${goalId}`).toBeDefined();
  return plan!;
}

test("runs the asymmetric leave journey to completion with real evidence", async () => {
  const result = await runJourney({
    comparisonId,
    plan: planFor("membership-asymmetric", "leave"),
    origin: BENCHMARK_ORIGIN,
    seed: "phase-2",
  });

  expect(result.status).toBe("completed");
  expect(result.actionCount).toBe(3);
  expect(result.error).toBeUndefined();

  expect(result.events.map((event) => event.type)).toEqual([
    "navigate",
    "goal-selected",
    "click",
    "click",
    "click",
    "complete",
  ]);
  expect(result.events.map((event) => event.stepNo)).toEqual([0, 1, 2, 3, 4, 5]);

  expect(result.screenshots).toHaveLength(6);
  for (const shot of result.screenshots) {
    expect(Array.from(shot.bytes.subarray(0, 4))).toEqual(PNG_MAGIC);
  }
});

test("runs the balanced join journey in a single action", async () => {
  const result = await runJourney({
    comparisonId,
    plan: planFor("membership-balanced", "join"),
    origin: BENCHMARK_ORIGIN,
    seed: "phase-2",
  });

  expect(result.status).toBe("completed");
  expect(result.actionCount).toBe(1);
  expect(result.events.filter((event) => event.countsAsAction)).toHaveLength(1);
});

test("runs both consent-asymmetric goals with their documented counts", async () => {
  const accept = await runJourney({
    comparisonId,
    plan: planFor("consent-asymmetric", "accept"),
    origin: BENCHMARK_ORIGIN,
    seed: "phase-2",
  });
  expect(accept.status).toBe("completed");
  expect(accept.actionCount).toBe(1);

  const reject = await runJourney({
    comparisonId,
    plan: planFor("consent-asymmetric", "reject"),
    origin: BENCHMARK_ORIGIN,
    seed: "phase-2",
  });
  expect(reject.status).toBe("completed");
  expect(reject.actionCount).toBe(3);
});

test("does not complete when the origin is unreachable", async () => {
  const result = await runJourney({
    comparisonId,
    plan: planFor("membership-balanced", "join"),
    origin: "http://localhost:9999",
    seed: "phase-2",
  });

  expect(["failed", "blocked", "timeout"]).toContain(result.status);
  expect(result.error).toBeDefined();
});
