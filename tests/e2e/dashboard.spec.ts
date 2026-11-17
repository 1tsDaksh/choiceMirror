import { expect, test, type Page } from "@playwright/test";

const COMPARISON_URL = /\/comparisons\/(cmp_[a-f0-9]{16})/;

/**
 * Runs the consent-asymmetric scenario from the launcher (deterministic mode
 * is the default) and waits for the detail page to report Completed. The
 * single-flight lock on POST /api/comparisons is shared across parallel
 * spec files, so a busy response is waited out and retried.
 */
async function runComparison(page: Page): Promise<void> {
  await page.goto("/");
  const scenarioRadio = page.getByRole("radio", {
    name: /Accept vs reject — asymmetric/,
  });
  await expect(scenarioRadio).toBeVisible();
  await scenarioRadio.check({ force: true });

  const busyStatus = page
    .getByRole("status")
    .filter({ hasText: "Another comparison is still running" });

  let navigated = false;
  for (let attempt = 0; attempt < 15 && !navigated; attempt++) {
    const already = COMPARISON_URL.exec(page.url());
    if (already !== null) {
      navigated = true;
      break;
    }

    try {
      await page.getByRole("button", { name: "Run comparison" }).click();
    } catch (error) {
      // Navigation already in flight — the run we were waiting for.
      if (COMPARISON_URL.exec(page.url()) !== null) {
        navigated = true;
        break;
      }
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
      navigated = true;
    } else if (outcome === "busy") {
      await page.waitForTimeout(1_500);
    } else {
      throw new Error("run did not start");
    }
  }
  expect(navigated).toBe(true);

  await expect(
    page.getByRole("status").filter({ hasText: "Completed" }),
  ).toBeVisible({ timeout: 60_000 });
}

test("selecting a recorded step shows its screenshot and event evidence", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await runComparison(page);

  const goalA = page.getByRole("region", { name: "Goal A journey" });
  await goalA.getByRole("button", { name: /step 2/ }).click();

  const inspector = page.getByRole("region", { name: "Evidence inspector" });
  await expect(inspector.getByText("Step 2", { exact: true })).toBeVisible();
  await expect(
    inspector.getByText("Counted as an action: Yes"),
  ).toBeVisible();
  // Step 2 of the accept journey is its single counted action.
  await expect(
    inspector.getByText("Accept preference", { exact: true }),
  ).toBeVisible();

  // Timestamp rendered as a machine-readable time element.
  const time = inspector.locator("time");
  await expect(time).toBeVisible();
  await expect(time).toHaveAttribute("datetime", /\d{4}-\d{2}-\d{2}T/);

  // The step's screenshot really loads from the artifact route.
  const image = inspector.locator("img").first();
  await expect(image).toBeAttached();
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
});

test("the inspector reports non-counted steps honestly", async ({ page }) => {
  test.setTimeout(90_000);
  await runComparison(page);

  const goalA = page.getByRole("region", { name: "Goal A journey" });
  await goalA.getByRole("button", { name: /step 1/ }).click();

  const inspector = page.getByRole("region", { name: "Evidence inspector" });
  await expect(inspector.getByText("Step 1", { exact: true })).toBeVisible();
  await expect(
    inspector.getByText("Counted as an action: No"),
  ).toBeVisible();
});

test("previous and next step buttons move between events", async ({ page }) => {
  test.setTimeout(90_000);
  await runComparison(page);

  const goalA = page.getByRole("region", { name: "Goal A journey" });
  await goalA.getByRole("button", { name: /step 2/ }).click();

  const inspector = page.getByRole("region", { name: "Evidence inspector" });
  const previous = inspector.getByRole("button", { name: "Previous step" });
  const next = inspector.getByRole("button", { name: "Next step" });

  await expect(inspector.getByText("Step 2", { exact: true })).toBeVisible();
  await expect(previous).toBeEnabled();

  // Goal A records four events (steps 0-3); Step 3 is the end.
  await next.click();
  await expect(inspector.getByText("Step 3", { exact: true })).toBeVisible();
  await expect(next).toBeDisabled();

  await previous.click();
  await expect(inspector.getByText("Step 2", { exact: true })).toBeVisible();
  await previous.click();
  await previous.click();
  await expect(inspector.getByText("Step 0", { exact: true })).toBeVisible();
  await expect(previous).toBeDisabled();
});

test("keyboard users can reach and operate the inspector", async ({ page }) => {
  test.setTimeout(90_000);
  await runComparison(page);

  const goalA = page.getByRole("region", { name: "Goal A journey" });
  const firstStepButton = goalA.getByRole("button").first();

  // Tab from the top of the page until the first recorded-step button.
  let reachedStep = false;
  for (let index = 0; index < 30 && !reachedStep; index++) {
    await page.keyboard.press("Tab");
    reachedStep = await firstStepButton.evaluate(
      (element) => element === document.activeElement,
    );
  }
  expect(reachedStep).toBe(true);

  await page.keyboard.press("Enter");
  const inspector = page.getByRole("region", { name: "Evidence inspector" });
  await expect(inspector.getByText("Step 0", { exact: true })).toBeVisible();

  // Continue Tab-ing into the inspector; Next step comes after the tracks.
  const next = inspector.getByRole("button", { name: "Next step" });
  let reachedNext = false;
  for (let index = 0; index < 40 && !reachedNext; index++) {
    await page.keyboard.press("Tab");
    reachedNext = await next.evaluate(
      (element) => element === document.activeElement,
    );
  }
  expect(reachedNext).toBe(true);

  await page.keyboard.press("Enter");
  await expect(inspector.getByText("Step 1", { exact: true })).toBeVisible();
});

test("methodology panel explains counting, evidence classes and limits", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await runComparison(page);

  const summary = page.getByText("How these measurements work", {
    exact: true,
  });
  await summary.click();

  const panel = page
    .locator("details")
    .filter({ hasText: "How these measurements work" });
  // Opening the disclosure makes the six sections visible.
  await expect(panel.locator("h3").first()).toBeVisible();

  for (const text of [
    "goal selection",
    "Observed",
    "Calculated",
    "Interpreted",
    "(max+1)/(min+1)",
    "not proof of unlawful or intentional manipulation",
    "interface friction",
  ]) {
    await expect(panel).toContainText(text);
  }
});

// ---------------------------------------------------------------------------
// Seeded state fixtures (written by tests/e2e/support/global-setup.ts).
// ---------------------------------------------------------------------------

test("a running comparison shows running state, pending tracks and an inconclusive finding", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/comparisons/cmp_5eed000000000001");

  await expect(
    page.getByRole("status").filter({ hasText: "Running" }),
  ).toBeVisible();

  for (const name of ["Goal A journey", "Goal B journey"] as const) {
    const track = page.getByRole("region", { name });
    await expect(track.getByText("Waiting", { exact: true })).toBeVisible();
    await expect(
      track.getByText("Waiting for this goal to run."),
    ).toBeVisible();
    await expect(track.getByText("Not available")).toBeVisible();
  }

  await expect(page.getByText("Inconclusive", { exact: true })).toBeVisible();

  const differenceCard = page
    .locator("div.rounded-2xl")
    .filter({ hasText: "Action difference" });
  await expect(differenceCard).toHaveCount(1);
  await expect(differenceCard.getByText("—", { exact: true })).toBeVisible();
  await expect(differenceCard.getByText("Not available")).toBeVisible();
});

test("a partial comparison never presents the failed journey as shorter", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/comparisons/cmp_5eed000000000002");

  await expect(page.getByText("Inconclusive", { exact: true })).toBeVisible();
  // The explanation names the recorded failure instead of a count claim.
  await expect(page.getByText("did not complete (failed)")).toBeVisible();

  const differenceCard = page
    .locator("div.rounded-2xl")
    .filter({ hasText: "Action difference" });
  await expect(differenceCard.getByText("—", { exact: true })).toBeVisible();

  const goalA = page.getByRole("region", { name: "Goal A journey" });
  await expect(goalA.getByText("Completed", { exact: true })).toBeVisible();
  await expect(goalA.getByText("1 recorded action")).toBeVisible();

  const goalB = page.getByRole("region", { name: "Goal B journey" });
  await expect(goalB.getByText("Failed", { exact: true })).toBeVisible();
  await expect(goalB.getByText("Journey error")).toBeVisible();
});

test("a legacy phase 2 record renders as deterministic without ai sections", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/comparisons/cmp_5eed000000000003");

  await expect(
    page.getByText("Mode: Deterministic", { exact: true }),
  ).toBeVisible();
  expect(
    await page.getByText("AI decisions (model-reported)").count(),
  ).toBe(0);
  await expect(
    page.getByRole("heading", {
      name: "Leaving required 2 more actions than joining",
    }),
  ).toBeVisible();
});

test("a corrupt journey file is treated as missing evidence, not as zero", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/comparisons/cmp_5eed000000000004");

  const goalA = page.getByRole("region", { name: "Goal A journey" });
  await expect(goalA.getByText("1 recorded action")).toBeVisible();

  const goalB = page.getByRole("region", { name: "Goal B journey" });
  await expect(goalB.getByText("Waiting", { exact: true })).toBeVisible();
  await expect(goalB.getByText("Not available")).toBeVisible();
  expect(await goalB.getByText("0 recorded actions").count()).toBe(0);

  await expect(page.getByText("Inconclusive", { exact: true })).toBeVisible();
});

test("a failing status poll shows a retryable error state", async ({ page }) => {
  test.setTimeout(60_000);
  const pollPattern = "**/api/comparisons/cmp_5eed000000000001";
  await page.route(pollPattern, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "seeded poll failure" }),
    }),
  );
  await page.goto("/comparisons/cmp_5eed000000000001");

  await expect(
    page.getByText("Comparison status unavailable"),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

  await page.unroute(pollPattern);
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Running" }),
  ).toBeVisible();
});
