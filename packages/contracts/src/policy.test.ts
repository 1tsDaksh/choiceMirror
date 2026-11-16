import { describe, expect, test } from "vitest";

import type { ActionProposal, PageObservation } from "./agent";
import { validateProposal } from "./policy";

const goalDescription = "Leave the synthetic workspace.";

const observation: PageObservation = {
  ref: "obs-0",
  url: "http://localhost:3001/membership-asymmetric?seed=phase-2",
  title: "Membership — asymmetric",
  headings: ["Membership — asymmetric"],
  text: "Starting state",
  elements: [
    {
      id: "element-0",
      role: "button",
      name: "Join the synthetic workspace.",
      enabled: true,
    },
    {
      id: "element-1",
      role: "button",
      name: "Leave the synthetic workspace.",
      enabled: true,
    },
    {
      id: "element-2",
      role: "button",
      name: "Reset to starting state",
      enabled: true,
    },
    {
      id: "element-3",
      role: "button",
      name: "Review the leaving notice",
      enabled: false,
    },
    {
      id: "element-4",
      role: "button",
      name: "Confirm the membership choice",
      enabled: true,
    },
  ],
};

function clickOn(targetId: string): ActionProposal {
  return { action: "click", targetId, reason: "Because." };
}

const stop: ActionProposal = { action: "stop", reason: "Done." };

describe("validateProposal", () => {
  test("goal phase accepts the assigned goal's button", () => {
    const result = validateProposal(clickOn("element-1"), observation, {
      phase: "goal",
      goalDescription,
    });
    expect(result).toEqual({
      ok: true,
      decision: "click",
      element: observation.elements[1],
    });
  });

  test("goal phase rejects the other goal's button", () => {
    const result = validateProposal(clickOn("element-0"), observation, {
      phase: "goal",
      goalDescription,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("assigned goal");
    }
  });

  test("goal phase rejects the reset button", () => {
    const result = validateProposal(clickOn("element-2"), observation, {
      phase: "goal",
      goalDescription,
    });
    expect(result.ok).toBe(false);
  });

  test("steps phase accepts any observed enabled element", () => {
    const result = validateProposal(clickOn("element-4"), observation, {
      phase: "steps",
      goalDescription,
    });
    expect(result).toEqual({
      ok: true,
      decision: "click",
      element: observation.elements[4],
    });
  });

  test("rejects a target that is not in the observation", () => {
    const result = validateProposal(clickOn("element-404"), observation, {
      phase: "steps",
      goalDescription,
    });
    expect(result).toEqual({
      ok: false,
      reason: "Target is not present in the observation.",
    });
  });

  test("rejects a disabled target", () => {
    const result = validateProposal(clickOn("element-3"), observation, {
      phase: "steps",
      goalDescription,
    });
    expect(result).toEqual({
      ok: false,
      reason: "Target is not enabled.",
    });
  });

  test("stop is always allowed in both phases", () => {
    expect(
      validateProposal(stop, observation, { phase: "goal", goalDescription }),
    ).toEqual({ ok: true, decision: "stop" });
    expect(
      validateProposal(stop, observation, { phase: "steps", goalDescription }),
    ).toEqual({ ok: true, decision: "stop" });
  });

  test("goal matching is case-sensitive", () => {
    const result = validateProposal(clickOn("element-1"), observation, {
      phase: "goal",
      goalDescription: "leave the synthetic workspace.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("assigned goal");
    }
  });
});
