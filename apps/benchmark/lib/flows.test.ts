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
});
