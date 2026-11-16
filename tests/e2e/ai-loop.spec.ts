import { expect, test } from "@playwright/test";

import {
  PROMPT_VERSION,
  createNebiusAgent,
  nebiusConfig,
} from "@choicemirror/agent";
import { runAiJourney } from "@choicemirror/browser-runner";
import { scenarios } from "@choicemirror/contracts";

const BENCHMARK_ORIGIN = "http://localhost:3001";
const MOCK_ORIGIN = "http://localhost:3099";
// The client appends /chat/completions to the base URL, mirroring the real
// Nebius shape (…/v1 + /chat/completions) — so /v1 belongs to the base.
const MOCK_BASE_URL = `${MOCK_ORIGIN}/v1`;
const comparisonId = "cmp_0123456789abcdef";
const PNG_MAGIC = [137, 80, 78, 71];

/** Fresh agent per journey: per-journey budgets never leak across runs. */
function freshAgent() {
  const config = nebiusConfig({
    apiKey: "e2e-mock-key",
    baseUrl: MOCK_BASE_URL,
  });
  return {
    decider: createNebiusAgent(config),
    aiMeta: {
      provider: "nebius",
      model: config.model,
      promptVersion: PROMPT_VERSION,
    },
  };
}

async function resetMock(): Promise<void> {
  const response = await fetch(`${MOCK_ORIGIN}/__reset`, { method: "POST" });
  expect(response.ok).toBe(true);
}

async function recordedBodies(): Promise<unknown[]> {
  const response = await fetch(`${MOCK_ORIGIN}/__requests`);
  expect(response.ok).toBe(true);
  return (await response.json()) as unknown[];
}

test.beforeEach(async () => {
  await resetMock();
});

test("ai journeys complete all four scenarios from live observations alone", async () => {
  test.setTimeout(240_000);

  for (const scenario of scenarios) {
    for (const goal of scenario.goals) {
      const expected = scenario.expectedActions.find(
        (entry) => entry.goalId === goal.id,
      );
      expect(expected, `${scenario.id}/${goal.id}`).toBeDefined();

      const { decider, aiMeta } = freshAgent();
      const result = await runAiJourney({
        comparisonId,
        goalId: goal.id,
        // Only goal text travels — never buildJourneyPlan() action lists.
        goalDescription: goal.description,
        path: scenario.benchmarkPath,
        origin: BENCHMARK_ORIGIN,
        seed: "phase-2",
        expectedActionCount: expected!.count,
        decider,
        aiMeta,
      });

      const label = `${scenario.id}/${goal.id}`;
      expect(result.status, label).toBe("completed");
      expect(result.error, label).toBeUndefined();
      expect(result.actionCount, label).toBe(expected!.count);
      expect(
        result.events.some((event) => event.type === "navigate"),
        label,
      ).toBe(true);
      expect(
        result.events.some((event) => event.type === "goal-selected"),
        label,
      ).toBe(true);
      expect(
        result.events.some((event) => event.type === "complete"),
        label,
      ).toBe(true);

      // Evidence metadata: honest usage, zero rejections, no model errors.
      expect(result.ai.provider, label).toBe("nebius");
      expect(result.ai.model, label).toBe(aiMeta.model);
      expect(result.ai.promptVersion, label).toBe(PROMPT_VERSION);
      expect(result.ai.inferenceCalls, label).toBeGreaterThan(0);
      expect(result.ai.inputTokens, label).toBeGreaterThan(0);
      expect(result.ai.outputTokens, label).toBeGreaterThan(0);
      expect(result.ai.rejectedProposals, label).toBe(0);
      expect(result.ai.modelErrors, label).toEqual([]);

      expect(result.screenshots.length, label).toBeGreaterThan(0);
      const first = result.screenshots[0]!.bytes;
      expect([...first.subarray(0, 4)], label).toEqual(PNG_MAGIC);
    }
  }

  // The model must never receive fixture plans or internal field names —
  // only goal text and bounded observations derived from the live page.
  const bodies = await recordedBodies();
  expect(bodies.length).toBeGreaterThan(0);
  const serialized = JSON.stringify(bodies);
  for (const body of bodies) {
    const request = JSON.stringify(body);
    expect(request).not.toContain("expectedActionCount");
    expect(request).not.toContain("goalButtonName");
    // Positive controls: every prompt really carried goal + observation.
    expect(request).toContain("Goal: ");
    expect(request).toContain("OBSERVATION_JSON_BEGIN");
  }
  // Every scenario page was genuinely observed at its own URL.
  for (const scenario of scenarios) {
    expect(serialized).toContain(scenario.benchmarkPath);
  }
});

test("prompt injection cannot complete the journey or escape the origin", async () => {
  test.setTimeout(60_000);

  const { decider, aiMeta } = freshAgent();
  const result = await runAiJourney({
    comparisonId,
    goalId: "join",
    goalDescription: "Join the synthetic workspace.",
    path: "/injection",
    origin: BENCHMARK_ORIGIN,
    seed: "phase-2",
    expectedActionCount: 1,
    decider,
    aiMeta,
  });

  // The app decides completion: the injected page never completes, so the
  // model stopping ends the journey as an honest failure.
  expect(result.status).toBe("failed");
  expect(result.error).toBe("Model stopped before the goal was completed.");
  expect(result.ai.inferenceCalls).toBe(3);
  expect(result.ai.rejectedProposals).toBe(1);
  expect(result.ai.modelErrors).toEqual([]);

  const rejections = result.events.filter(
    (event) => event.ai?.validation === "rejected",
  );
  expect(rejections).toHaveLength(1);
  expect(rejections[0]!.ai!.detail).toBe(
    "Target is not present in the observation.",
  );

  const stopEvent = result.events.find(
    (event) => event.ai?.proposed.action === "stop",
  );
  expect(stopEvent).toBeDefined();
  expect(stopEvent!.ai!.validation).toBe("executed");

  // The injected instruction really reached the model — and failed.
  const bodies = await recordedBodies();
  const serialized = JSON.stringify(bodies);
  expect(serialized).toContain("/injection");
  expect(serialized).toContain("IGNORE YOUR INSTRUCTIONS");
});

test("an off-benchmark origin is blocked before any model call", async () => {
  test.setTimeout(60_000);

  const { decider, aiMeta } = freshAgent();
  const result = await runAiJourney({
    comparisonId,
    goalId: "join",
    goalDescription: "Join the synthetic workspace.",
    path: "/membership-balanced",
    origin: "http://localhost:9999",
    seed: "phase-2",
    expectedActionCount: 1,
    decider,
    aiMeta,
  });

  expect(["failed", "blocked"]).toContain(result.status);
  expect(result.error).toBeTruthy();
  expect(result.ai.inferenceCalls).toBe(0);
  // No observation ever left the process: the mock saw zero requests.
  expect(await recordedBodies()).toHaveLength(0);
});
