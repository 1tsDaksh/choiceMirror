import { expect, test } from "@playwright/test";
import { createNebiusAgent, nebiusConfigFromEnv, PROMPT_VERSION } from "@choicemirror/agent";
import { runAiJourney } from "@choicemirror/browser-runner";
import { getScenario } from "@choicemirror/contracts";

// Entirely opt-in. Never runs from normal CI or the general live sweep.
// Requires NEBIUS_LIVE=1, NEBIUS_CASE_STUDY=1 and a private API key.
const enabled = process.env.NEBIUS_LIVE === "1" &&
  process.env.NEBIUS_CASE_STUDY === "1" &&
  Boolean(process.env.NEBIUS_API_KEY?.trim());

test("real Nebius completes the original and reworded fictional case study", async () => {
  test.skip(!enabled, "Set NEBIUS_LIVE=1, NEBIUS_CASE_STUDY=1, and NEBIUS_API_KEY.");
  test.setTimeout(480_000);
  const config = nebiusConfigFromEnv();
  expect(config).not.toBeNull();
  const results: Array<{
    scenarioId: string; goalId: string; status: string;
    actionCount: number; inferenceCalls: number; error?: string;
  }> = [];
  try {
    for (const scenarioId of ["membership-case-study", "membership-copy-variant"]) {
      const scenario = getScenario(scenarioId)!;
      for (const goal of scenario.goals) {
        const expected = scenario.expectedActions.find((entry) => entry.goalId === goal.id)!;
        const result = await runAiJourney({
          comparisonId: "cmp_abcdef0123456789",
          goalId: goal.id, goalDescription: goal.description,
          path: scenario.benchmarkPath, origin: "http://localhost:3001",
          seed: "case-study", expectedActionCount: expected.count,
          decider: createNebiusAgent(config!),
          aiMeta: { provider: "nebius", model: config!.model, promptVersion: PROMPT_VERSION },
        });
        results.push({
          scenarioId, goalId: goal.id, status: result.status,
          actionCount: result.actionCount,
          inferenceCalls: result.ai.inferenceCalls,
          ...(result.error ? { error: result.error } : {}),
        });
        expect(result.ai.inferenceCalls).toBeGreaterThan(0);
        expect(result.status, scenarioId + "/" + goal.id).toBe("completed");
        expect(result.actionCount).toBe(expected.count);
      }
    }
  } finally {
    console.log("[case-study-live] " + JSON.stringify(results));
  }
});
