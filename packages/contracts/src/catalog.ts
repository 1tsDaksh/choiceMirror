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
  {
    id: "membership-case-study",
    title: "Join vs cancel — documented-pattern case study",
    description:
      "Fictional OrbitPass membership. An evidence-informed retention journey inspired by historical FTC-described cancellation friction; not an Amazon UI reproduction.",
    benchmarkPath: "/membership-case-study",
    kind: "membership",
    variant: "asymmetric",
    goals: [
      {
        id: "join",
        label: "Join",
        description: "Start a fictional OrbitPass membership.",
      },
      {
        id: "leave",
        label: "Leave",
        description: "Cancel a fictional OrbitPass membership.",
      },
    ],
    expectedActions: [
      { goalId: "join", count: 1 },
      { goalId: "leave", count: 5 },
    ],
  },
  {
    id: "membership-copy-variant",
    title: "Join vs cancel — reworded interface",
    description:
      "Same fictional tasks and five-step cancellation structure, but every action label is rewritten to test navigation robustness.",
    benchmarkPath: "/membership-copy-variant",
    kind: "membership",
    variant: "asymmetric",
    goals: [
      {
        id: "join",
        label: "Join",
        description: "Start a fictional OrbitPass membership.",
      },
      {
        id: "leave",
        label: "Leave",
        description: "Cancel a fictional OrbitPass membership.",
      },
    ],
    expectedActions: [
      { goalId: "join", count: 1 },
      { goalId: "leave", count: 5 },
    ],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}
