import type { Scenario } from "./scenario";

export const scenarios: Scenario[] = [
  {
    id: "membership-balanced",
    title: "Join vs leave — balanced",
    description:
      "A synthetic workspace where joining and leaving each require one direct action.",
    benchmarkPath: "/membership-balanced",
    kind: "membership",
    variant: "balanced",
    goals: [
      {
        id: "join",
        label: "Join",
        description: "Join the synthetic workspace.",
      },
      {
        id: "leave",
        label: "Leave",
        description: "Leave the synthetic workspace.",
      },
    ],
    expectedActions: [
      { goalId: "join", count: 1 },
      { goalId: "leave", count: 1 },
    ],
  },
  {
    id: "membership-asymmetric",
    title: "Join vs leave — asymmetric",
    description:
      "A synthetic workspace where joining stays direct while leaving requires three explicit confirmations.",
    benchmarkPath: "/membership-asymmetric",
    kind: "membership",
    variant: "asymmetric",
    goals: [
      {
        id: "join",
        label: "Join",
        description: "Join the synthetic workspace.",
      },
      {
        id: "leave",
        label: "Leave",
        description: "Leave the synthetic workspace through three review steps.",
      },
    ],
    expectedActions: [
      { goalId: "join", count: 1 },
      { goalId: "leave", count: 3 },
    ],
  },
  {
    id: "consent-balanced",
    title: "Accept vs reject — balanced",
    description:
      "A synthetic preference panel where accepting and rejecting each require one direct action.",
    benchmarkPath: "/consent-balanced",
    kind: "consent",
    variant: "balanced",
    goals: [
      {
        id: "accept",
        label: "Accept",
        description: "Accept the synthetic preference.",
      },
      {
        id: "reject",
        label: "Reject",
        description: "Reject the synthetic preference.",
      },
    ],
    expectedActions: [
      { goalId: "accept", count: 1 },
      { goalId: "reject", count: 1 },
    ],
  },
  {
    id: "consent-asymmetric",
    title: "Accept vs reject — asymmetric",
    description:
      "A synthetic preference panel where accepting stays direct while rejecting requires three explicit confirmations.",
    benchmarkPath: "/consent-asymmetric",
    kind: "consent",
    variant: "asymmetric",
    goals: [
      {
        id: "accept",
        label: "Accept",
        description: "Accept the synthetic preference.",
      },
      {
        id: "reject",
        label: "Reject",
        description: "Reject the synthetic preference through three review steps.",
      },
    ],
    expectedActions: [
      { goalId: "accept", count: 1 },
      { goalId: "reject", count: 3 },
    ],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}
