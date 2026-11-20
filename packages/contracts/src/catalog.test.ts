import { describe, expect, it } from "vitest";

import * as catalog from "./catalog";

const expectedGoals: Record<string, [string, string]> = {
  "membership-balanced": ["join", "leave"],
  "membership-asymmetric": ["join", "leave"],
  "consent-balanced": ["accept", "reject"],
  "consent-asymmetric": ["accept", "reject"],
  "membership-case-study": ["join", "leave"],
  "membership-copy-variant": ["join", "leave"],
};

describe("scenario catalog", () => {
  it("exposes six unique controlled scenarios", () => {
    const scenarios = catalog.scenarios ?? [];

    expect(scenarios).toHaveLength(6);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(4);
  });

  it("resolves known scenarios and not unknown IDs", () => {
    expect(catalog.getScenario).toBeTypeOf("function");

    const found = catalog.getScenario?.("membership-balanced");
    const missing = catalog.getScenario?.("unknown-scenario");

    expect(found?.id).toBe("membership-balanced");
    expect(missing).toBeUndefined();
  });

  it("defines exact opposing goal pairs for every scenario", () => {
    for (const [scenarioId, goalIds] of Object.entries(expectedGoals)) {
      const scenario = catalog.getScenario?.(scenarioId);

      expect(scenario?.goals.map((goal) => goal.id)).toEqual(goalIds);
    }
  });

  it("keeps balanced action counts equal", () => {
    const scenarios = catalog.getScenario
      ? ["membership-balanced", "consent-balanced"].map(
          (id) => catalog.getScenario?.(id),
        )
      : [];

    expect(
      scenarios.map(
        (scenario) =>
          scenario?.expectedActions.map((entry) => entry.count).join("/"),
      ),
    ).toEqual(["1/1", "1/1"]);
  });

  it("gives both variants of a kind the same goal pair", () => {
    for (const kind of ["membership", "consent"] as const) {
      const balanced = catalog.scenarios.find(
        (scenario) => scenario.kind === kind && scenario.variant === "balanced",
      );
      const asymmetric = catalog.scenarios.find(
        (scenario) =>
          scenario.kind === kind && scenario.variant === "asymmetric",
      );

      if (!balanced || !asymmetric) {
        throw new Error(`Missing ${kind} variant pair`);
      }

      expect(asymmetric.goals.map(({ id, label }) => ({ id, label }))).toEqual(
        balanced.goals.map(({ id, label }) => ({ id, label })),
      );
    }
  });

  it("makes asymmetric leave and reject paths frictionally harder", () => {
    const membership = catalog.getScenario?.("membership-asymmetric");
    const consent = catalog.getScenario?.("consent-asymmetric");

    const counts = (scenario: typeof membership) =>
      Object.fromEntries(
        scenario?.expectedActions.map((entry) => [
          entry.goalId,
          entry.count,
        ]) ?? [],
      );

    expect(counts(membership)).toEqual({ join: 1, leave: 3 });
    expect(counts(consent)).toEqual({ accept: 1, reject: 3 });
  });
  it("keeps the case-study pair and copy-variation comparable", () => {
    const original = catalog.getScenario("membership-case-study")!;
    const variant = catalog.getScenario("membership-copy-variant")!;
    expect(original.goals).toEqual(variant.goals);
    expect(original.expectedActions).toEqual(variant.expectedActions);
    expect(original.expectedActions.map((goal) => goal.count)).toEqual([1, 5]);
    expect(original.benchmarkPath).not.toBe(variant.benchmarkPath);
  });
});
