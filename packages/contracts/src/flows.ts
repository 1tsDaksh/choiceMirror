import type { Goal, Scenario } from "./scenario";

export type FlowDefinition = {
  scenarioId: Scenario["id"];
  startTitle: string;
  startDescription: string;
  goals: Partial<Record<Goal["id"], readonly string[]>>;
};

export type FlowState = {
  goalId: Goal["id"];
  stepIndex: number;
  complete: boolean;
};

const flows: Record<Scenario["id"], FlowDefinition> = {
  "membership-balanced": {
    scenarioId: "membership-balanced",
    startTitle: "Choose your membership action",
    startDescription:
      "Both membership choices begin from the same synthetic workspace state.",
    goals: {
      join: ["Join workspace"],
      leave: ["Leave workspace"],
    },
  },
  "membership-asymmetric": {
    scenarioId: "membership-asymmetric",
    startTitle: "Choose your membership action",
    startDescription:
      "Both membership choices begin from the same synthetic workspace state.",
    goals: {
      join: ["Join workspace"],
      leave: [
        "Review the leaving notice",
        "Confirm the membership choice",
        "Leave workspace",
      ],
    },
  },
  "consent-balanced": {
    scenarioId: "consent-balanced",
    startTitle: "Choose your preference action",
    startDescription:
      "Both preference choices begin from the same synthetic panel state.",
    goals: {
      accept: ["Accept preference"],
      reject: ["Reject preference"],
    },
  },
  "consent-asymmetric": {
    scenarioId: "consent-asymmetric",
    startTitle: "Choose your preference action",
    startDescription:
      "Both preference choices begin from the same synthetic panel state.",
    goals: {
      accept: ["Accept preference"],
      reject: [
        "Review the rejection notice",
        "Confirm the preference choice",
        "Reject preference",
      ],
    },
  },
};

export function getFlow(scenarioId: string): FlowDefinition | undefined {
  if (!(scenarioId in flows)) {
    return undefined;
  }

  return flows[scenarioId as Scenario["id"]];
}

export function initialFlowState(
  flow: FlowDefinition,
  goalId: Goal["id"],
): FlowState | undefined {
  if (!flow.goals[goalId]) {
    return undefined;
  }

  return {
    goalId,
    stepIndex: 0,
    complete: false,
  };
}
