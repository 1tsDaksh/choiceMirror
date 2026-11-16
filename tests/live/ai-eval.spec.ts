import { expect, test } from "@playwright/test";

import {
  PROMPT_VERSION,
  createNebiusAgent,
  nebiusConfigFromEnv,
} from "@choicemirror/agent";
import { runAiJourney } from "@choicemirror/browser-runner";
import { scenarios } from "@choicemirror/contracts";

/**
 * Opt-in live evaluation: every catalog journey against the real Nebius
 * API, with no mock anywhere. Guarded by NEBIUS_LIVE=1 AND a key so CI and
 * default runs never spend credits. Every reported number comes from these
 * real results — nothing here is simulated or pre-filled.
 */
const live =
  process.env.NEBIUS_LIVE === "1" &&
  Boolean(process.env.NEBIUS_API_KEY?.trim());

const BENCHMARK_ORIGIN = "http://localhost:3001";
const comparisonId = "cmp_0123456789abcdef";

type JourneyOutcome = {
  scenarioId: string;
  goalId: string;
  status: string;
  actionCount: number;
  inferenceCalls: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
};

const outcomes: JourneyOutcome[] = [];

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
}

test.describe("live nebius evaluation", () => {
  test.skip(
    !live,
    "Set NEBIUS_LIVE=1 and NEBIUS_API_KEY to run live inference.",
  );

  test("model-driven journeys complete against the real Nebius API", async () => {
    // Real inference over 8 journeys: each journey is hard-bounded by the
    // runner's own 60s timeout, so 10 minutes covers the whole sweep.
    test.setTimeout(600_000);

    const config = nebiusConfigFromEnv();
    expect(config, "NEBIUS_API_KEY must be configured").not.toBeNull();

    for (const scenario of scenarios) {
      for (const goal of scenario.goals) {
        const expected = scenario.expectedActions.find(
          (entry) => entry.goalId === goal.id,
        );
        expect(expected, `${scenario.id}/${goal.id}`).toBeDefined();

        // Fresh agent per journey: budgets are per journey, exactly like
        // the web controller's one-createAiAgent()-per-journey path.
        const decider = createNebiusAgent(config!);
        const startedAt = Date.now();
        const result = await runAiJourney({
          comparisonId,
          goalId: goal.id,
          goalDescription: goal.description,
          path: scenario.benchmarkPath,
          origin: BENCHMARK_ORIGIN,
          seed: "phase-2",
          expectedActionCount: expected!.count,
          decider,
          aiMeta: {
            provider: "nebius",
            model: config!.model,
            promptVersion: PROMPT_VERSION,
          },
        });
        outcomes.push({
          scenarioId: scenario.id,
          goalId: goal.id,
          status: result.status,
          actionCount: result.actionCount,
          inferenceCalls: result.ai.inferenceCalls,
          inputTokens: result.ai.inputTokens,
          outputTokens: result.ai.outputTokens,
          latencyMs: Date.now() - startedAt,
          ...(result.error !== undefined ? { error: result.error } : {}),
        });
      }
    }

    // Honest smoke, not a benchmark claim: every journey actually reached
    // the model, and at least one genuinely completed. Invalid credits or
    // credentials fail here with the real error — the correct outcome.
    for (const outcome of outcomes) {
      const label = `${outcome.scenarioId}/${outcome.goalId}`;
      expect(outcome.inferenceCalls, label).toBeGreaterThanOrEqual(1);
    }
    expect(
      outcomes.some((outcome) => outcome.status === "completed"),
      "at least one genuine model-driven completion",
    ).toBe(true);
  });

  // Printed unconditionally, even when the test above fails, so the PR can
  // quote genuine numbers only — zeros here mean "did not run", never
  // "simulated".
  test.afterAll(() => {
    if (outcomes.length === 0) {
      console.log("[live-eval] no journeys ran (test skipped).");
      return;
    }
    const latencies = outcomes.map((outcome) => outcome.latencyMs);
    const completed = outcomes.filter(
      (outcome) => outcome.status === "completed",
    );
    const summary = {
      journeys: outcomes.length,
      completed: completed.length,
      successRate: Number((completed.length / outcomes.length).toFixed(3)),
      totalInferenceCalls: outcomes.reduce(
        (sum, outcome) => sum + outcome.inferenceCalls,
        0,
      ),
      totalInputTokens: outcomes.reduce(
        (sum, outcome) => sum + outcome.inputTokens,
        0,
      ),
      totalOutputTokens: outcomes.reduce(
        (sum, outcome) => sum + outcome.outputTokens,
        0,
      ),
      latencyMs: {
        min: Math.min(...latencies),
        median: median(latencies),
        max: Math.max(...latencies),
      },
      statuses: outcomes.map((outcome) => ({
        journey: `${outcome.scenarioId}/${outcome.goalId}`,
        status: outcome.status,
        actionCount: outcome.actionCount,
        inferenceCalls: outcome.inferenceCalls,
        inputTokens: outcome.inputTokens,
        outputTokens: outcome.outputTokens,
        latencyMs: outcome.latencyMs,
      })),
      errors: outcomes
        .filter((outcome) => outcome.error !== undefined)
        .map((outcome) => ({
          journey: `${outcome.scenarioId}/${outcome.goalId}`,
          status: outcome.status,
          error: outcome.error,
        })),
    };
    console.log(`[live-eval] ${JSON.stringify(summary, null, 2)}`);
  });
});
