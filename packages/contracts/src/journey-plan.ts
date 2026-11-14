import { getFlow } from "./flows";
import type { Goal, Scenario } from "./scenario";

export type JourneyPlan = {
  scenarioId: Scenario["id"];
  path: string;
  goalId: Goal["id"];
  goalButtonName: string;
  actions: readonly string[];
  expectedActionCount: number;
};

export function buildJourneyPlan(
  scenario: Scenario,
  goalId: Goal["id"],
): JourneyPlan | undefined {
  const flow = getFlow(scenario.id);
  const goal = scenario.goals.find((candidate) => candidate.id === goalId);

  if (!flow || !goal) {
    return undefined;
  }

  const actions = flow.goals[goalId];
  if (!actions) {
    return undefined;
  }

  return {
    scenarioId: scenario.id,
    path: scenario.benchmarkPath,
    goalId,
    goalButtonName: goal.description,
    actions,
    expectedActionCount: actions.length,
  };
}
