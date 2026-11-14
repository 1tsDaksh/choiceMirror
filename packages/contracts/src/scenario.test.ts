import { describe, expect, it } from "vitest";

import { scenarios } from "./catalog";
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

  it("validates the real catalog against the shared schema", () => {
    const parsedScenarios = contract.scenarioListSchema?.safeParse(scenarios);

    expect(parsedScenarios?.success).toBe(true);
  });

  it("rejects protocol-relative benchmark paths", () => {
    const scenario = scenarios[0];
    if (!scenario) {
      throw new Error("catalog is empty");
    }

    const result = contract.scenarioSchema?.safeParse({
      ...scenario,
      benchmarkPath: "//evil.example/choice",
    });

    expect(result?.success).toBe(false);
  });
});
