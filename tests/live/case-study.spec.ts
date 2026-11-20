import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import { createNebiusAgent, nebiusConfigFromEnv, PROMPT_VERSION } from "@choicemirror/agent";
import { runAiJourney } from "@choicemirror/browser-runner";
import { getScenario } from "@choicemirror/contracts";

// Real paid inference ONLY. Normal CI, pull requests and local test runs skip this.
const enabled =
  process.env.NEBIUS_LIVE === "1" &&
  process.env.NEBIUS_CASE_STUDY === "1" &&
  Boolean(process.env.NEBIUS_API_KEY?.trim());

type RecordedJourney = {
  scenarioId: string;
  goalId: string;
  status: string;
  expectedActions: number;
  actionCount: number;
  recordedClicks: number;
  inferenceCalls: number;
  inputTokens: number;
  outputTokens: number;
  rejectedProposals: number;
  modelErrors: Array<{ kind: string; message: string }>;
  screenshotCount: number;
  screenshots: Array<{
    file: string;
    sha256: string;
    bytes: number;
    artifactId: string;
    label: string;
  }>;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  error?: string;
};

const outputDir = join(process.cwd(), "test-results", "case-study-live");

function sanitize(text: string): string {
  const key = process.env.NEBIUS_API_KEY?.trim();
  const cleaned = key ? text.replaceAll(key, "[REDACTED]") : text;
  return cleaned.slice(0, 300);
}

test("genuine Nebius navigates both OrbitPass goal pairs and saves provenance", async () => {
  test.skip(!enabled, "Set NEBIUS_LIVE=1, NEBIUS_CASE_STUDY=1 and private NEBIUS_API_KEY.");
  test.setTimeout(480_000);

  mkdirSync(outputDir, { recursive: true });
  const outcomes: RecordedJourney[] = [];
  const config = nebiusConfigFromEnv();
  expect(config, "Nebius secret must be configured in the trusted runner.").not.toBeNull();
  const startedAt = new Date().toISOString();

  try {
    // Bounded scope: exactly four actual journeys against two local fictional pages.
    for (const scenarioId of ["membership-case-study", "membership-copy-variant"]) {
      const scenario = getScenario(scenarioId);
      expect(scenario, "registered case-study fixture").toBeDefined();

      for (const goal of scenario!.goals) {
        const expected = scenario!.expectedActions.find((entry) => entry.goalId === goal.id);
        expect(expected).toBeDefined();
        const start = Date.now();

        // The agent receives the goal and observed page, not a prefilled action plan.
        const result = await runAiJourney({
          comparisonId: "cmp_abcdef0123456789",
          goalId: goal.id,
          goalDescription: goal.description,
          path: scenario!.benchmarkPath,
          origin: "http://localhost:3001",
          seed: "case-study",
          expectedActionCount: expected!.count,
          decider: createNebiusAgent(config!),
          aiMeta: {
            provider: "nebius",
            model: config!.model,
            promptVersion: PROMPT_VERSION,
          },
        });

        const screenshots = result.screenshots.map((shot, index) => {
          const file = scenarioId + "-" + goal.id + "-" + index + ".png";
          writeFileSync(join(outputDir, file), shot.bytes);
          return {
            file,
            sha256: createHash("sha256").update(shot.bytes).digest("hex"),
            bytes: shot.bytes.length,
            artifactId: shot.id,
            label: shot.label,
          };
        });

        const row: RecordedJourney = {
          scenarioId,
          goalId: goal.id,
          status: result.status,
          expectedActions: expected!.count,
          actionCount: result.actionCount,
          recordedClicks: result.events.filter((event) => event.countsAsAction).length,
          inferenceCalls: result.ai.inferenceCalls,
          inputTokens: result.ai.inputTokens,
          outputTokens: result.ai.outputTokens,
          rejectedProposals: result.ai.rejectedProposals,
          modelErrors: result.ai.modelErrors.map((entry) => ({
            kind: entry.kind,
            message: sanitize(entry.message),
          })),
          screenshotCount: screenshots.length,
          screenshots,
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          durationMs: Date.now() - start,
          ...(result.error ? { error: sanitize(result.error) } : {}),
        };
        outcomes.push(row);
        console.log("[case-study-live] " + JSON.stringify({
          scenarioId: row.scenarioId,
          goalId: row.goalId,
          status: row.status,
          actionCount: row.actionCount,
          inferenceCalls: row.inferenceCalls,
          screenshotCount: row.screenshotCount,
          rejectedProposals: row.rejectedProposals,
          modelErrors: row.modelErrors,
          ...(row.error ? { error: row.error } : {}),
        }));
      }
    }
  } finally {
    // Durable result saved and uploaded on both pass and fail. No API key,
    // request headers, private environment variables or full prompts included.
    const summary = {
      provider: "nebius",
      executionMode: "ai",
      model: config?.model ?? "unavailable",
      fixtureType: "fictional-controlled-benchmark",
      initiatedBy: "trusted-main GitHub Actions workflow",
      githubRunId: process.env.GITHUB_RUN_ID ?? null,
      githubCommit: process.env.GITHUB_SHA ?? null,
      startedAt,
      finishedAt: new Date().toISOString(),
      journeysRequested: 4,
      journeysRecorded: outcomes.length,
      completed: outcomes.filter((row) => row.status === "completed").length,
      totalInferenceCalls: outcomes.reduce((sum, row) => sum + row.inferenceCalls, 0),
      totalInputTokens: outcomes.reduce((sum, row) => sum + row.inputTokens, 0),
      totalOutputTokens: outcomes.reduce((sum, row) => sum + row.outputTokens, 0),
      outcomes,
    };
    writeFileSync(join(outputDir, "results.json"), JSON.stringify(summary, null, 2) + "\n");
    console.log("[case-study-live-summary] " + JSON.stringify({
      journeysRecorded: summary.journeysRecorded,
      completed: summary.completed,
      totalInferenceCalls: summary.totalInferenceCalls,
      totalInputTokens: summary.totalInputTokens,
      totalOutputTokens: summary.totalOutputTokens,
    }));
  }

  // Evaluate all four paths even if one fails; don't cherry-pick a success.
  expect(outcomes).toHaveLength(4);
  for (const row of outcomes) {
    const label = row.scenarioId + "/" + row.goalId;
    expect.soft(row.inferenceCalls, label + " actual Nebius calls").toBeGreaterThan(0);
    expect.soft(row.status, label + " final status").toBe("completed");
    expect.soft(row.actionCount, label + " recorded actions").toBe(row.expectedActions);
    expect.soft(row.recordedClicks, label + " trace-backed clicks").toBe(row.actionCount);
    expect.soft(row.screenshotCount, label + " real PNG checkpoints").toBeGreaterThan(0);
  }
});
