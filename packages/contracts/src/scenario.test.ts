import { describe, expect, it } from "vitest";

import * as contract from "./scenario";

describe("scenario contracts", () => {
  it("validates a valid paired comparison request", () => {
    const result = contract.comparisonRequestSchema?.safeParse({
      scenarioId: "membership-balanced",
      goalIds: ["join", "leave"],
    });

    expect(result?.success).toBe(true);
  });

  it("rejects malformed comparison requests", () => {
    const wrongGoalCount = contract.comparisonRequestSchema?.safeParse({
      scenarioId: "membership-balanced",
      goalIds: ["join"],
    });
    const missingScenario = contract.comparisonRequestSchema?.safeParse({
      goalIds: ["join", "leave"],
    });

    expect(wrongGoalCount?.success).toBe(false);
    expect(missingScenario?.success).toBe(false);
  });

  it("validates every catalog scenario against the shared schema", () => {
    const parsedScenarios = contract.scenarioListSchema?.safeParse([
      {
        id: "membership-balanced",
        title: "Join vs leave",
        description: "Two equal starting choices in a local synthetic workspace.",
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
    ]);

    expect(parsedScenarios?.success).toBe(true);
  });
});
