import { expect, test } from "@playwright/test";

import {
  PROMPT_VERSION,
  createNebiusAgent,
  nebiusConfigFromEnv,
} from "@choicemirror/agent";
import { runAiJourney } from "@choicemirror/browser-runner";
import { scenarios } from "@choicemirror/contracts";

/**
 * Opt-in bounded live repeatability (spec §6): every scenario × goal pair is
 * run as a paired comparison in 3 consecutive rounds against the real Nebius
 * API, with no mock anywhere. Guarded by NEBIUS_LIVE=1 AND NEBIUS_LIVE_REPEAT=1
 * AND a key, so CI and default runs never spend credits — and the extra
 * repeat flag keeps this suite out of the regular `pnpm test:live` sweep. Every
 * reported number comes from these real results — nothing is simulated.
 */
const repeat =
  process.env.NEBIUS_LIVE === "1" &&
  process.env.NEBIUS_LIVE_REPEAT === "1" &&
  Boolean(process.env.NEBIUS_API_KEY?.trim());

const REPEAT_ROUNDS = 3;

const BENCHMARK_ORIGIN = "http://localhost:3001";
const comparisonId = "cmp_0123456789abcdee";

type GoalOutcome = {
  status: string;
  actionCount: number;
  inferenceCalls: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
};

type PairRecord = {
  scenarioId: string;
  round: number;
  goalA: GoalOutcome;
  goalB: GoalOutcome;
};

type JourneyRecord = {
  scenarioId: string;
  goalId: string;
  round: number;
  outcome: GoalOutcome;
};

const pairs: PairRecord[] = [];
const journeyLedger: JourneyRecord[] = [];

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
}

test.describe("live nebius repeatability", () => {
  test.skip(
    !repeat,
    "Set NEBIUS_LIVE=1, NEBIUS_LIVE_REPEAT=1 and NEBIUS_API_KEY to run live repeatability.",
  );

  test("paired comparisons repeat consistently across rounds against the real Nebius API", async () => {
    // 24 journeys (4 scenarios × 2 goals × 3 rounds), each hard-bounded by the
    // runner's own 60s timeout — 30 minutes covers the whole sweep with slack.
    test.setTimeout(1_800_000);

    const config = nebiusConfigFromEnv();
    expect(config, "NEBIUS_API_KEY must be configured").not.toBeNull();

    for (const scenario of scenarios) {
      const [goalA, goalB] = scenario.goals;
      expect(goalA && goalB, `${scenario.id}`).toBeDefined();

      for (let round = 1; round <= REPEAT_ROUNDS; round += 1) {
        const expectedActions = scenario.expectedActions;
        const runGoal = async (
          goal: NonNullable<typeof goalA>,
        ): Promise<GoalOutcome> => {
          const expected = expectedActions.find(
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
            seed: "phase-5",
            expectedActionCount: expected!.count,
            decider,
            aiMeta: {
              provider: "nebius",
              model: config!.model,
              promptVersion: PROMPT_VERSION,
            },
          });
          return {
            status: result.status,
            actionCount: result.actionCount,
            inferenceCalls: result.ai.inferenceCalls,
            inputTokens: result.ai.inputTokens,
            outputTokens: result.ai.outputTokens,
            latencyMs: Date.now() - startedAt,
            ...(result.error !== undefined ? { error: result.error } : {}),
          };
        };

        // Both goals of the pair run sequentially within the same round.
        const outcomeA = await runGoal(goalA!);
        const outcomeB = await runGoal(goalB!);
        pairs.push({
          scenarioId: scenario.id,
          round,
          goalA: outcomeA,
          goalB: outcomeB,
        });
        journeyLedger.push(
          { scenarioId: scenario.id, goalId: goalA!.id, round, outcome: outcomeA },
          { scenarioId: scenario.id, goalId: goalB!.id, round, outcome: outcomeB },
        );
      }
    }

    // Honest smoke, not a benchmark claim: every journey actually reached
    // the model, and at least one genuinely completed. Invalid credits or
    // credentials fail here with the real error — the correct outcome.
    for (const record of journeyLedger) {
      expect(record.outcome.inferenceCalls, `${record.scenarioId}/${record.goalId} round ${record.round}`).toBeGreaterThanOrEqual(1);
    }
    expect(
      journeyLedger.some((record) => record.outcome.status === "completed"),
      "at least one genuine model-driven completion",
    ).toBe(true);
  });

  // Printed unconditionally, even when the test above fails, so the PR can
  // quote genuine numbers only — zeros here mean "did not run", never
  // "simulated".
  test.afterAll(() => {
    if (journeyLedger.length === 0) {
      console.log("[live-repeat] no pairs ran (test skipped).");
      return;
    }
    const completed = journeyLedger.filter(
      (record) => record.outcome.status === "completed",
    );
    const latencies = journeyLedger.map(
      (record) => record.outcome.latencyMs,
    );

    // Per scenario × goal: unique action counts across the REPEAT_ROUNDS
    // rounds. A single-element array means every round agreed exactly.
    const actionCountConsistency: Record<string, number[]> = {};
    for (const scenario of scenarios) {
      const goalAId = scenario.goals[0]?.id;
      const goalBId = scenario.goals[1]?.id;
      const scenarioPairs = pairs
        .filter((pair) => pair.scenarioId === scenario.id)
        .sort((left, right) => left.round - right.round);
      if (goalAId !== undefined) {
        actionCountConsistency[`${scenario.id}/${goalAId}`] = [
          ...new Set(scenarioPairs.map((pair) => pair.goalA.actionCount)),
        ].sort((left, right) => left - right);
      }
      if (goalBId !== undefined) {
        actionCountConsistency[`${scenario.id}/${goalBId}`] = [
          ...new Set(scenarioPairs.map((pair) => pair.goalB.actionCount)),
        ].sort((left, right) => left - right);
      }
    }

    const summary = {
      pairsAttempted: pairs.length,
      pairsCompleted: pairs.filter(
        (pair) =>
          pair.goalA.status === "completed" && pair.goalB.status === "completed",
      ).length,
      journeysCompleted: completed.length,
      actionCountConsistency,
      totalInferenceCalls: journeyLedger.reduce(
        (sum, record) => sum + record.outcome.inferenceCalls,
        0,
      ),
      totalTokens: journeyLedger.reduce(
        (sum, record) =>
          sum + record.outcome.inputTokens + record.outcome.outputTokens,
        0,
      ),
      latencyMs: {
        min: Math.min(...latencies),
        median: median(latencies),
        max: Math.max(...latencies),
      },
      errors: journeyLedger
        .filter((record) => record.outcome.error !== undefined)
        .map((record) => ({
          journey: `${record.scenarioId}/${record.goalId}`,
          round: record.round,
          status: record.outcome.status,
          error: record.outcome.error,
        })),
    };
    console.log(`[live-repeat] ${JSON.stringify(summary, null, 2)}`);
  });
});
