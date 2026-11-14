import { describe, expect, it } from "vitest";

import { scenarios } from "@choicemirror/contracts";

import { getFlow, initialFlowState } from "./flows";

describe("benchmark flow definitions", () => {
  it("defines a flow for every catalog scenario", () => {
    for (const scenario of scenarios) {
      expect(getFlow(scenario.id)).toBeDefined();
    }
  });

  it("gives each balanced goal one direct action", () => {
    expect(getFlow("membership-balanced")?.goals).toEqual({
      join: ["Join workspace"],
      leave: ["Leave workspace"],
    });
    expect(getFlow("consent-balanced")?.goals).toEqual({
      accept: ["Accept preference"],
      reject: ["Reject preference"],
    });
  });

  it("gives asymmetric leave and reject paths three ordered actions", () => {
    expect(getFlow("membership-asymmetric")?.goals.leave).toEqual([
      "Review the leaving notice",
      "Confirm the membership choice",
      "Leave workspace",
    ]);
    expect(getFlow("consent-asymmetric")?.goals.reject).toEqual([
      "Review the rejection notice",
      "Confirm the preference choice",
      "Reject preference",
    ]);
  });

  it("starts every goal at the same reset state", () => {
    for (const scenario of scenarios) {
      const flow = getFlow(scenario.id);
      expect(flow).toBeDefined();

      for (const goal of scenario.goals) {
        expect(initialFlowState(flow!, goal.id)).toEqual({
          goalId: goal.id,
          stepIndex: 0,
          complete: false,
        });
      }
    }
  });

  it("does not define a flow for an unknown scenario", () => {
    expect(getFlow("unknown-scenario")).toBeUndefined();
  });

  it("differs across variants only in the documented hard path", () => {
    for (const kind of ["membership", "consent"] as const) {
      const balanced = getFlow(`${kind}-balanced`);
      const asymmetric = getFlow(`${kind}-asymmetric`);

      if (!balanced || !asymmetric) {
        throw new Error(`Missing ${kind} flow pair`);
      }

      expect(asymmetric.startTitle).toBe(balanced.startTitle);
      expect(asymmetric.startDescription).toBe(balanced.startDescription);

      const asymmetricScenario = scenarios.find(
        (scenario) =>
          scenario.kind === kind && scenario.variant === "asymmetric",
      );
      if (!asymmetricScenario) {
        throw new Error(`Missing ${kind} asymmetric scenario`);
      }

      const hardGoalId = asymmetricScenario.expectedActions.find(
        (action) => action.count > 1,
      )?.goalId;
      const easyGoalId = asymmetricScenario.expectedActions.find(
        (action) => action.count === 1,
      )?.goalId;
      if (!hardGoalId || !easyGoalId) {
        throw new Error(`Missing ${kind} goal counts`);
      }

      // The easy path is byte-identical across variants.
      expect(asymmetric.goals[easyGoalId]).toEqual(balanced.goals[easyGoalId]);
      expect(asymmetric.goals[easyGoalId]).toHaveLength(1);
      // Only the documented hard path carries extra friction.
      expect(asymmetric.goals[hardGoalId]).toHaveLength(3);
    }
  });

  it("matches every catalog action count to its flow length", () => {
    for (const scenario of scenarios) {
      const flow = getFlow(scenario.id);
      if (!flow) {
        throw new Error(`Missing flow for ${scenario.id}`);
      }

      for (const { goalId, count } of scenario.expectedActions) {
        expect(flow.goals[goalId]).toHaveLength(count);
      }
    }
  });
});
