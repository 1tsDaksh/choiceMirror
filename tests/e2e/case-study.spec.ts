import { expect, test } from "@playwright/test";
import {
  buildJourneyPlan,
  getScenario,
  type ComparisonDetail,
} from "@choicemirror/contracts";
import { runAiJourney, runJourney } from "@choicemirror/browser-runner";
import { PROMPT_VERSION, createNebiusAgent, nebiusConfig } from "@choicemirror/agent";

const origin = "http://localhost:3001";
const runId = "cmp_abcdef0123456789";

test("case-study paths produce observed 1 vs 5 actions with genuine browser evidence", async ({ request }) => {
  test.setTimeout(120_000);
  const scenario = getScenario("membership-case-study")!;
  const start = await request.post("/api/comparisons", {
    data: { scenarioId: scenario.id, goalIds: ["join", "leave"], mode: "deterministic" },
  });
  expect(start.status()).toBe(202);
  const { comparisonId } = (await start.json()) as { comparisonId: string };
  let detail: ComparisonDetail | undefined;
  for (let attempt = 0; attempt < 100; attempt++) {
    const response = await request.get("/api/comparisons/" + comparisonId);
    expect(response.status()).toBe(200);
    detail = (await response.json()) as ComparisonDetail;
    if (detail.comparison.status !== "running") break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  expect(detail?.comparison.status).toBe("completed");
  expect(detail?.journeys.map((j) => j.status)).toEqual(["completed", "completed"]);
  expect(detail?.journeys.map((j) => j.actionCount)).toEqual([1, 5]);
  for (const j of detail!.journeys) {
    expect(j.events.filter((e) => e.countsAsAction)).toHaveLength(j.actionCount);
    expect(j.screenshots.length).toBeGreaterThanOrEqual(j.actionCount + 3);
    const id = j.screenshots.at(-1)!.id;
    const screenshot = await request.get("/api/comparisons/" + comparisonId + "/artifacts/" + id);
    expect(screenshot.status()).toBe(200);
    expect(Array.from((await screenshot.body()).subarray(0, 4))).toEqual([137, 80, 78, 71]);
  }
});

test("fixed-selector baseline fails on copy variation but observation-driven mock can traverse it", async () => {
  test.setTimeout(120_000);
  const original = getScenario("membership-case-study")!;
  const variant = getScenario("membership-copy-variant")!;
  const originalPlan = buildJourneyPlan(original, "leave")!;
  const updatedPlan = buildJourneyPlan(variant, "leave")!;

  const reference = await runJourney({
    comparisonId: runId, plan: originalPlan, origin, seed: "case-study",
  });
  expect(reference.status).toBe("completed");
  expect(reference.actionCount).toBe(5);

  // A deliberately brittle fixed-selector baseline: unchanged CTA labels
  // from the reference layout, but running on the reworded interface.
  const brittle = await runJourney({
    comparisonId: runId,
    plan: { ...originalPlan, path: variant.benchmarkPath },
    origin, seed: "case-study",
    stepTimeoutMs: 3_000, journeyTimeoutMs: 15_000,
  });
  expect(brittle.status).not.toBe("completed");
  expect(brittle.actionCount).toBe(0);
  expect(brittle.error).toBeDefined();

  // Deterministic automation CAN be updated; do not claim this proves AI
  // outperforms a maintained script. It just illustrates selector fragility.
  const maintained = await runJourney({
    comparisonId: runId, plan: updatedPlan, origin, seed: "case-study",
  });
  expect(maintained.status).toBe("completed");
  expect(maintained.actionCount).toBe(5);

  // This is a MOCK adapter used by CI, not real Nebius inference.
  const config = nebiusConfig({
    apiKey: "e2e-mock-key",
    baseUrl: "http://localhost:3099/v1",
    retryBackoffMs: 0,
  });
  const adapted = await runAiJourney({
    comparisonId: runId, goalId: "leave",
    goalDescription: variant.goals[1]!.description,
    path: variant.benchmarkPath, origin, seed: "case-study",
    expectedActionCount: 5,
    decider: createNebiusAgent(config),
    aiMeta: { provider: "test-mock", model: config.model, promptVersion: PROMPT_VERSION },
  });
  expect(adapted.status).toBe("completed");
  expect(adapted.actionCount).toBe(5);
  expect(adapted.ai.inferenceCalls).toBeGreaterThan(0);
  expect(adapted.ai.modelErrors).toEqual([]);
});

test("copy variation changes CTA names but preserves task and count", async ({ page }) => {
  const original = getScenario("membership-case-study")!;
  const variant = getScenario("membership-copy-variant")!;
  expect(original.goals).toEqual(variant.goals);
  await page.goto(origin + variant.benchmarkPath + "?seed=case-study");
  await page.getByRole("button", { name: /Cancel a fictional OrbitPass membership/ }).click();
  await expect(page.getByRole("button", { name: "View account options" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review membership details" })).toHaveCount(0);
  await page.getByRole("button", { name: "View account options" }).click();
  await page.getByRole("button", { name: "Reset to starting state" }).click();
  await expect(page.getByRole("heading", { name: "Choose your OrbitPass membership action" })).toBeVisible();
});
