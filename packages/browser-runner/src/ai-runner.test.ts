import { describe, expect, it } from "vitest";
import type {
  ActionProposal,
  AgentDecision,
  AgentDecider,
  DeciderInput,
} from "@choicemirror/contracts";

import { runAiJourney, type RunAiJourneyOptions } from "./ai-runner";
import type { RawPageState } from "./observation";
import type { AiJourneyDriver, OpenAiJourney } from "./runner";

const ORIGIN = "http://localhost:3001";
const PATH = "/start";
const COMPARISON_ID = "cmp_0123456789abcdef";
const GOAL_ID = "leave" as const;
const GOAL_DESCRIPTION = "Finish the flow";
const GOAL_BUTTON = "Finish the flow";
const OTHER_GOAL_BUTTON = "Take the other path";
const STEP_BUTTON = "Continue";

type FakeState = { closeCount: number; clickedIds: string[] };

type FakeDriver = {
  open: OpenAiJourney;
  state: FakeState;
  control: { observeUrl?: string; failObserve?: boolean };
};

/**
 * State machine fake: start page (two goal buttons + Reset) → after the goal
 * click a step page (one enabled step button + Reset). completionState turns
 * true after `requiredSteps` step clicks. Records clicks and closes.
 */
function createFakeDriver(requiredSteps: number): FakeDriver {
  let page: "start" | "step" = "start";
  let stepClicks = 0;
  let currentUrl = `${ORIGIN}${PATH}?seed=phase-2`;
  const state: FakeState = { closeCount: 0, clickedIds: [] };
  const control: FakeDriver["control"] = {};

  const startElements = [
    { role: "button" as const, name: GOAL_BUTTON, enabled: true, occurrence: 0 },
    {
      role: "button" as const,
      name: OTHER_GOAL_BUTTON,
      enabled: true,
      occurrence: 0,
    },
    {
      role: "button" as const,
      name: "Reset to starting state",
      enabled: true,
      occurrence: 0,
    },
  ];
  const stepElements = [
    { role: "button" as const, name: STEP_BUTTON, enabled: true, occurrence: 0 },
    {
      role: "button" as const,
      name: "Reset to starting state",
      enabled: true,
      occurrence: 0,
    },
  ];

  const observe = async (): Promise<RawPageState> => {
    if (control.failObserve) {
      throw new Error("observe exploded");
    }
    return {
      url: control.observeUrl ?? currentUrl,
      title: page === "start" ? "Start" : "Step",
      headings: [page === "start" ? "Start" : "Step 1"],
      text: page === "start" ? "Choose a goal." : "One step at a time.",
      elements: page === "start" ? startElements : stepElements,
    };
  };

  const driver: AiJourneyDriver = {
    async navigate(url) {
      currentUrl = url;
    },
    async selectGoal() {
      throw new Error("unexpected deterministic call: selectGoal");
    },
    async clickAction() {
      throw new Error("unexpected deterministic call: clickAction");
    },
    async assertCompleted() {
      throw new Error("unexpected deterministic call: assertCompleted");
    },
    async screenshot() {
      return Buffer.from("png");
    },
    async currentUrl() {
      return currentUrl;
    },
    observe,
    async clickElement(targetId) {
      state.clickedIds.push(targetId);
      if (page === "start") {
        // Only the goal button passes policy in the goal phase.
        page = "step";
      } else if (targetId === "element-0") {
        stepClicks += 1;
      }
    },
    async completionState() {
      return { complete: page === "step" && stepClicks >= requiredSteps };
    },
  };

  return {
    open: async () => ({
      driver,
      close: async () => {
        state.closeCount += 1;
      },
    }),
    state,
    control,
  };
}

type Scripted = ActionProposal | AgentDecision;

function scriptedDecider(script: Scripted[]): {
  decider: AgentDecider;
  inputs: DeciderInput[];
} {
  const inputs: DeciderInput[] = [];
  let index = 0;
  const decider: AgentDecider = {
    async decide(input) {
      inputs.push(input);
      const entry = script[Math.min(index, script.length - 1)];
      index += 1;
      if (entry === undefined) {
        throw new Error("decider script is empty");
      }
      if ("kind" in entry) {
        return entry;
      }
      return {
        kind: "proposal",
        proposal: entry,
        apiCalls: 1,
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        latencyMs: 12,
      };
    },
  };
  return { decider, inputs };
}

function makeOptions(fake: FakeDriver, decider: AgentDecider): RunAiJourneyOptions {
  return {
    comparisonId: COMPARISON_ID,
    goalId: GOAL_ID,
    goalDescription: GOAL_DESCRIPTION,
    path: PATH,
    origin: ORIGIN,
    seed: "phase-2",
    expectedActionCount: 3,
    decider,
    aiMeta: {
      provider: "nebius",
      model: "test-model",
      promptVersion: "phase3-v1",
    },
    openJourney: fake.open,
  };
}

const clickOn = (targetId: string, reason: string): ActionProposal => ({
  action: "click",
  targetId,
  reason,
});

describe("runAiJourney", () => {
  it("completes a three-step journey with full AI evidence", async () => {
    const fake = createFakeDriver(3);
    const { decider } = scriptedDecider([
      clickOn("element-0", "Selecting the assigned goal."),
      clickOn("element-0", "Advancing to the next step."),
      clickOn("element-0", "Advancing again."),
      clickOn("element-0", "Taking the final step."),
    ]);

    const result = await runAiJourney(makeOptions(fake, decider));

    expect(result.status).toBe("completed");
    expect(result.error).toBeUndefined();
    expect(result.actionCount).toBe(3);

    expect(result.events.map((event) => event.type)).toEqual([
      "navigate",
      "goal-selected",
      "click",
      "click",
      "click",
      "complete",
    ]);
    expect(result.events.map((event) => event.stepNo)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(result.events.filter((event) => event.countsAsAction)).toHaveLength(
      result.actionCount,
    );

    const journeyId = `${COMPARISON_ID}-${GOAL_ID}`;
    expect(result.screenshots.map((shot) => shot.id)).toEqual([
      `${journeyId}-start.png`,
      `${journeyId}-goal.png`,
      `${journeyId}-step-1.png`,
      `${journeyId}-step-2.png`,
      `${journeyId}-step-3.png`,
      `${journeyId}-complete.png`,
    ]);
    expect(fake.state.closeCount).toBe(1);
    expect(fake.state.clickedIds).toEqual([
      "element-0",
      "element-0",
      "element-0",
      "element-0",
    ]);

    expect(result.ai.provider).toBe("nebius");
    expect(result.ai.model).toBe("test-model");
    expect(result.ai.promptVersion).toBe("phase3-v1");
    expect(result.ai.inferenceCalls).toBe(4);
    expect(result.ai.inputTokens).toBe(40);
    expect(result.ai.outputTokens).toBe(20);
    expect(result.ai.rejectedProposals).toBe(0);
    expect(result.ai.modelErrors).toEqual([]);

    const decisions = result.events.filter(
      (event) => event.type === "click" || event.type === "goal-selected",
    );
    for (const [index, event] of decisions.entries()) {
      expect(event.ai?.proposed.reason).toBeTruthy();
      expect(event.ai?.validation).toBe("executed");
      expect(event.ai?.observationRef).toBe(`obs-${index}`);
    }
  });

  it("rejects a wrong goal, feeds back, then completes", async () => {
    const fake = createFakeDriver(1);
    const { decider, inputs } = scriptedDecider([
      clickOn("element-1", "I choose the other goal."),
      clickOn("element-0", "Correcting to the assigned goal."),
      clickOn("element-0", "Doing the one step."),
    ]);

    const result = await runAiJourney(makeOptions(fake, decider));

    expect(result.status).toBe("completed");
    expect(result.ai.rejectedProposals).toBe(1);

    const rejection = result.events.find(
      (event) => event.label === "Model proposal rejected",
    );
    expect(rejection?.type).toBe("error");
    expect(rejection?.countsAsAction).toBe(false);
    expect(rejection?.ai?.validation).toBe("rejected");
    expect(rejection?.detail).toBe("Target does not match the assigned goal.");

    expect(inputs[1]?.feedback).toContain(
      "Target does not match the assigned goal.",
    );
    expect(inputs[1]?.observation.ref).toBe(inputs[0]?.observation.ref);
  });

  it("fails after the rejection budget is exhausted", async () => {
    const fake = createFakeDriver(3);
    const { decider } = scriptedDecider([
      clickOn("element-404", "Ghost target."),
    ]);

    const result = await runAiJourney({
      ...makeOptions(fake, decider),
      maxRejected: 2,
    });

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Model kept proposing invalid actions.");
    expect(
      result.events.filter((event) => event.label === "Model proposal rejected"),
    ).toHaveLength(3);
    expect(fake.state.closeCount).toBe(1);
  });

  it("treats schema-invalid proposals as rejections", async () => {
    const fake = createFakeDriver(3);
    const junk = {
      action: "explode",
      targetId: "element-0",
      reason: "nonsense",
    } as unknown as ActionProposal;
    const { decider } = scriptedDecider([junk]);

    const result = await runAiJourney({
      ...makeOptions(fake, decider),
      maxRejected: 0,
    });

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Model kept proposing invalid actions.");
    const rejection = result.events.find(
      (event) => event.label === "Model proposal rejected",
    );
    expect(rejection?.detail).toBe("Proposal failed schema validation.");
    // No valid proposal exists to record, so the event carries no ai block —
    // evidence must stay schema-valid.
    expect(rejection?.ai).toBeUndefined();
    expect(
      result.events.filter((event) => event.label === "Model proposal rejected"),
    ).toHaveLength(1);
  });

  it("records an early model stop as a failure", async () => {
    const fake = createFakeDriver(3);
    const { decider } = scriptedDecider([
      { action: "stop", reason: "I give up." },
    ]);

    const result = await runAiJourney(makeOptions(fake, decider));

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Model stopped before the goal was completed.");
    const stop = result.events.find(
      (event) => event.label === "Model stopped",
    );
    expect(stop?.ai?.validation).toBe("executed");
    expect(stop?.ai?.proposed.action).toBe("stop");
    expect(fake.state.closeCount).toBe(1);
  });

  it("surfaces model inference errors as failures with summary detail", async () => {
    const fake = createFakeDriver(3);
    const { decider } = scriptedDecider([
      {
        kind: "error",
        errorKind: "auth",
        message: "Nebius rejected the API key (HTTP 401).",
        apiCalls: 1,
      },
    ]);

    const result = await runAiJourney(makeOptions(fake, decider));

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Nebius rejected the API key (HTTP 401).");
    expect(result.ai.modelErrors[0]?.kind).toBe("auth");
    expect(result.ai.inferenceCalls).toBe(1);
    const failure = result.events.find(
      (event) => event.label === "Model inference failed",
    );
    expect(failure?.ai).toBeUndefined();
    expect(fake.state.closeCount).toBe(1);
  });

  it("blocks when the decision limit is reached", async () => {
    const fake = createFakeDriver(99); // never completes
    const { decider } = scriptedDecider([
      clickOn("element-0", "Keep going."),
    ]);

    const result = await runAiJourney({
      ...makeOptions(fake, decider),
      maxDecisions: 2,
    });

    expect(result.status).toBe("blocked");
    expect(result.error).toBe("Decision limit exceeded.");
    expect(fake.state.closeCount).toBe(1);
  });

  it("blocks when the executed action limit is reached", async () => {
    const fake = createFakeDriver(3);
    const { decider } = scriptedDecider([
      clickOn("element-0", "Goal."),
      clickOn("element-0", "Step one."),
      clickOn("element-0", "Step two."),
    ]);

    const result = await runAiJourney({
      ...makeOptions(fake, decider),
      maxActions: 1,
    });

    expect(result.status).toBe("blocked");
    expect(result.error).toBe("Action limit exceeded.");
    expect(result.actionCount).toBe(1);
    expect(fake.state.closeCount).toBe(1);
  });

  it("closes the journey when observe fails", async () => {
    const fake = createFakeDriver(3);
    fake.control.failObserve = true;
    const { decider } = scriptedDecider([
      clickOn("element-0", "Never reached."),
    ]);

    const result = await runAiJourney(makeOptions(fake, decider));

    expect(result.status).toBe("failed");
    expect(result.error).toBe("observe exploded");
    expect(fake.state.closeCount).toBe(1);
  });

  it("times out on a hanging decider and still cleans up", async () => {
    const fake = createFakeDriver(3);
    const hanging: AgentDecider = {
      decide: () => new Promise<AgentDecision>(() => {}),
    };

    const result = await runAiJourney({
      ...makeOptions(fake, hanging),
      journeyTimeoutMs: 20,
    });

    expect(result.status).toBe("timeout");
    expect(fake.state.closeCount).toBe(1);
  }, 10_000);

  it("blocks an observation that left the allowed origin", async () => {
    const fake = createFakeDriver(3);
    fake.control.observeUrl = "https://evil.example/";
    const { decider } = scriptedDecider([
      clickOn("element-0", "Never reached."),
    ]);

    const result = await runAiJourney(makeOptions(fake, decider));

    expect(result.status).toBe("blocked");
    expect(result.error).toBe("Observation left the allowed origin.");
    expect(fake.state.closeCount).toBe(1);
  });
});
