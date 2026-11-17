import {
  buildJourneyPlan,
  getScenario,
  type JourneyPlan,
  type Scenario,
} from "@choicemirror/contracts";
import { expect, test } from "@playwright/test";

import { runJourney } from "@choicemirror/browser-runner";

const BENCHMARK_ORIGIN = "http://localhost:3001";
const comparisonId = "cmp_0123456789abcdef";
const RUNS_PER_GOAL = 3;

const SCENARIO_IDS: readonly Scenario["id"][] = [
  "membership-balanced",
  "membership-asymmetric",
  "consent-balanced",
  "consent-asymmetric",
];

function planFor(
  scenarioId: string,
  goalId: "join" | "leave" | "accept" | "reject",
): JourneyPlan {
  const scenario = getScenario(scenarioId);
  expect(scenario, scenarioId).toBeDefined();
  const plan = buildJourneyPlan(scenario!, goalId);
  expect(plan, `${scenarioId}/${goalId}`).toBeDefined();
  return plan!;
}

/**
 * Three identical runs of each goal path must produce identical recorded
 * action counts — the repeatability evidence quoted in the docs. The
 * catalog's expectedActions are used for validation only: they confirm the
 * fixture plan, they are not the measurement.
 */
for (const scenarioId of SCENARIO_IDS) {
  test(`repeatability: ${scenarioId} records identical counts across three runs per goal`, async () => {
    test.setTimeout(120_000);
    const scenario = getScenario(scenarioId);
    expect(scenario, scenarioId).toBeDefined();

    for (const goal of scenario!.goals) {
      const plan = planFor(scenarioId, goal.id);
      const expected = scenario!.expectedActions.find(
        (entry) => entry.goalId === goal.id,
      );
      expect(expected, `${scenarioId}/${goal.id} expected count`).toBeDefined();

      const statuses: string[] = [];
      const actionCounts: number[] = [];

      for (let run = 0; run < RUNS_PER_GOAL; run++) {
        const result = await runJourney({
          comparisonId,
          plan,
          origin: BENCHMARK_ORIGIN,
          seed: "repeatability",
        });

        expect(result.status).toBe("completed");
        expect(result.actionCount).not.toBeNull();
        // The recorded events must agree with the reported count.
        expect(
          result.events.filter((event) => event.countsAsAction),
        ).toHaveLength(result.actionCount!);
        // Validation only: the fixture plan's documented count.
        expect(result.actionCount).toBe(expected!.count);

        statuses.push(result.status);
        actionCounts.push(result.actionCount!);
      }

      // Repeatability itself: all three runs recorded the same count.
      expect(new Set(actionCounts).size).toBe(1);

      const statusLabel =
        new Set(statuses).size === 1
          ? `${statuses[0]}×${RUNS_PER_GOAL}`
          : statuses.join(",");
      console.log(
        `repeatability ${scenarioId}/${goal.id}: ${RUNS_PER_GOAL} runs → statuses [${statusLabel}], actions [${actionCounts.join(",")}]`,
      );
    }
  });
}
