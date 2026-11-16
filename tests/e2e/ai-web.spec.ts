import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import type { ComparisonDetail } from "@choicemirror/contracts";

const SCENARIO_RADIO = /Join vs leave — asymmetric/;
const COMPARISON_URL = /\/comparisons\/(cmp_[a-f0-9]{16})/;

async function waitForTerminalComparison(
  request: APIRequestContext,
  comparisonId: string,
): Promise<ComparisonDetail> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const response = await request.get(`/api/comparisons/${comparisonId}`);
    expect(response.status()).toBe(200);
    const detail = (await response.json()) as ComparisonDetail;
    if (detail.comparison.status !== "running") {
      return detail;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`comparison ${comparisonId} did not finish within 60s`);
}

/**
 * Selects the scenario + execution mode and runs the comparison, returning
 * the comparison id. Parallel spec files share the single-flight lock on
 * POST /api/comparisons, so a 429 ("another comparison is still running")
 * is waited out and retried instead of failing the run.
 */
async function runFromLauncher(page: Page, modeName: RegExp): Promise<string> {
  await page.goto("/");
  const scenarioRadio = page.getByRole("radio", { name: SCENARIO_RADIO });
  await expect(scenarioRadio).toBeVisible();
  await scenarioRadio.check({ force: true });

  const modeRadio = page.getByRole("radio", { name: modeName });
  await expect(modeRadio).toBeVisible();
  await modeRadio.check({ force: true });

  const busyStatus = page
    .getByRole("status")
    .filter({ hasText: "Another comparison is still running" });

  for (let attempt = 0; attempt < 15; attempt++) {
    const already = COMPARISON_URL.exec(page.url());
    if (already !== null) return already[1]!;

    try {
      await page.getByRole("button", { name: "Run comparison" }).click();
    } catch (error) {
      // Navigation already in flight — the run we were waiting for.
      const navigating = COMPARISON_URL.exec(page.url());
      if (navigating !== null) return navigating[1]!;
      throw error;
    }

    const outcome = await Promise.race([
      page
        .waitForURL(COMPARISON_URL, { timeout: 10_000 })
        .then(() => "navigated" as const)
        .catch(() => "timeout" as const),
      busyStatus
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => "busy" as const)
        .catch(() => "timeout" as const),
    ]);

    if (outcome === "navigated") {
      const match = COMPARISON_URL.exec(page.url());
      expect(match).not.toBeNull();
      return match![1]!;
    }
    if (outcome === "busy") {
      await page.waitForTimeout(1_500);
      continue;
    }

    const statusTexts = await page
      .getByRole("status")
      .allTextContents()
      .catch(() => []);
    throw new Error(`run did not start; status: ${statusTexts.join(" | ")}`);
  }
  throw new Error("comparison never started: single-flight lock stayed busy");
}

async function expectLoadedScreenshots(panel: ReturnType<Page["locator"]>) {
  const firstImage = panel.locator("img").first();
  await expect(firstImage).toBeAttached();
  await firstImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      firstImage.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
}

test("ai run through the ui shows model-driven decisions and evidence", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);

  const comparisonId = await runFromLauncher(page, /AI \(Nebius\)/);

  // The detail page polls until the controller finishes both goals.
  await expect(
    page.getByRole("status").filter({ hasText: "Completed" }),
  ).toBeVisible({ timeout: 60_000 });

  const detail = await waitForTerminalComparison(request, comparisonId);
  expect(detail.comparison.status).toBe("completed");
  expect(detail.comparison.mode).toBe("ai");

  // Header badge: "Mode: AI · <model>" — model comes from the run's evidence.
  await expect(page.getByText(/^Mode: AI · .+/)).toBeVisible();

  const goalAPanel = page.getByRole("region", { name: "Goal A journey" });
  const goalBPanel = page.getByRole("region", { name: "Goal B journey" });

  for (const panel of [goalAPanel, goalBPanel]) {
    // Model-reported decisions with provider/model/prompt and token usage.
    await expect(panel.getByText("AI decisions (model-reported)")).toBeVisible();
    await expect(panel.getByText(/^nebius · .+ · prompt /)).toBeVisible();
    await expect(
      panel.getByText(
        /[1-9]\d* inference calls · [1-9]\d* input \/ [1-9]\d* output tokens · \d+ rejected proposals/,
      ),
    ).toBeVisible();

    // At least one event chip: proposed action, validation badge, reason.
    const clickEvent = panel
      .locator("li", { hasText: /proposed: click · element-\d+/ })
      .first();
    await expect(clickEvent).toBeVisible();
    await expect(clickEvent.getByText("executed", { exact: true })).toBeVisible();
    await expect(
      clickEvent.locator("p.text-xs.text-secondary-text").first(),
    ).not.toBeEmpty();

    // Evidence screenshots really render.
    await expect(panel.getByText("Ordered events")).toBeVisible();
    await expectLoadedScreenshots(panel);
  }
});

test("deterministic runs stay explicitly labelled without ai sections", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);

  const comparisonId = await runFromLauncher(page, /Deterministic/);

  await expect(
    page.getByRole("status").filter({ hasText: "Completed" }),
  ).toBeVisible({ timeout: 60_000 });

  const detail = await waitForTerminalComparison(request, comparisonId);
  expect(detail.comparison.status).toBe("completed");
  expect(detail.comparison.mode).toBe("deterministic");

  await expect(
    page.getByText("Mode: Deterministic", { exact: true }),
  ).toBeVisible();

  // Phase 2 evidence rendering stays intact; nothing model-reported shows.
  expect(await page.getByText("AI decisions (model-reported)").count()).toBe(0);
  expect(await page.getByText(/^proposed:/).count()).toBe(0);

  const goalAPanel = page.getByRole("region", { name: "Goal A journey" });
  await expect(goalAPanel.getByText("Ordered events")).toBeVisible();
  await expectLoadedScreenshots(goalAPanel);
});
