import { describe, expect, it } from "vitest";

import { getScenario, scenarios } from "./catalog";
import { buildJourneyPlan } from "./journey-plan";

describe("buildJourneyPlan", () => {
  it("builds a plan for every scenario and goal with catalog-matching counts", () => {
    for (const scenario of scenarios) {
      for (const goal of scenario.goals) {
        const plan = buildJourneyPlan(scenario, goal.id);

        expect(plan, `${scenario.id}/${goal.id}`).toBeDefined();
        expect(plan?.scenarioId).toBe(scenario.id);
        expect(plan?.path).toBe(scenario.benchmarkPath);
        expect(plan?.goalId).toBe(goal.id);
        expect(plan?.goalButtonName).toBe(goal.description);
        expect(plan?.expectedActionCount).toBe(
          scenario.expectedActions.find((e) => e.goalId === goal.id)?.count,
        );
        expect(plan?.actions.length).toBe(plan?.expectedActionCount);
      }
    }
  });

  it("pins the asymmetric leave journey's three review actions", () => {
    const scenario = getScenario("membership-asymmetric");
    expect(scenario).toBeDefined();

    const plan = buildJourneyPlan(scenario!, "leave");
    expect(plan?.actions).toEqual([
      "Review the leaving notice",
      "Confirm the membership choice",
      "Leave workspace",
    ]);
    expect(plan?.expectedActionCount).toBe(3);
  });

  it("returns undefined for a goal the scenario does not have", () => {
    const consent = getScenario("consent-balanced");
    expect(consent).toBeDefined();

    expect(buildJourneyPlan(consent!, "join")).toBeUndefined();
  });
});
