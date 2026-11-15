import {
  expect,
  test,
  type APIRequestContext,
} from "@playwright/test";
import { scenarios, type ComparisonDetail } from "@choicemirror/contracts";

const BENCHMARK_ORIGIN = "http://localhost:3001";

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

test("all four scenarios complete both goals with documented counts", async ({
  request,
}) => {
  // Four real browser comparisons run sequentially here.
  test.setTimeout(120_000);

  for (const scenario of scenarios) {
    const start = await request.post("/api/comparisons", {
      data: {
        scenarioId: scenario.id,
        goalIds: scenario.goals.map((goal) => goal.id),
      },
    });
    expect(start.status(), `starting ${scenario.id}`).toBe(202);
    const { comparisonId } = (await start.json()) as { comparisonId: string };

    const detail = await waitForTerminalComparison(request, comparisonId);
    expect(detail.comparison.status, scenario.id).toBe("completed");
    expect(detail.journeys).toHaveLength(2);
    expect(detail.journeys.map((journey) => journey.goalId)).toEqual(
      scenario.goals.map((goal) => goal.id),
    );

    for (const journey of detail.journeys) {
      const expectedCount = scenario.expectedActions.find(
        (entry) => entry.goalId === journey.goalId,
      )?.count;
      expect(
        expectedCount,
        `expectedActions entry for ${scenario.id}/${journey.goalId}`,
      ).toBeDefined();

      expect(journey.status, `${scenario.id}/${journey.goalId}`).toBe(
        "completed",
      );
      expect(journey.actionCount).toBe(expectedCount);
      expect(journey.expectedActionCount).toBe(expectedCount);

      // stepNo is strictly increasing from 0 in execution order.
      journey.events.forEach((event, index) => {
        expect(event.stepNo, `${scenario.id}/${journey.goalId}`).toBe(index);
      });
      expect(
        journey.events.filter((event) => event.countsAsAction),
      ).toHaveLength(expectedCount!);

      // Goal selection is recorded separately and never counts as an action
      // (the fixture opens with a navigate event first); the journey ends
      // with an explicit completion event.
      const goalSelected = journey.events.find(
        (event) => event.type === "goal-selected",
      );
      expect(
        goalSelected,
        `${scenario.id}/${journey.goalId} records goal selection`,
      ).toBeDefined();
      expect(goalSelected?.countsAsAction).toBe(false);
      expect(journey.events.at(-1)?.type).toBe("complete");

      // Starting state, goal selection, one shot per action, completion.
      expect(journey.screenshots.length).toBeGreaterThanOrEqual(
        journey.actionCount + 3,
      );
    }

    // Equivalent starting conditions for both goals of the scenario.
    const [firstJourney, secondJourney] = detail.journeys;
    expect(firstJourney.seed).toBe(secondJourney.seed);
    expect(firstJourney.viewport).toEqual(secondJourney.viewport);
    expect(firstJourney.origin).toBe(secondJourney.origin);
    expect(firstJourney.origin).toBe(BENCHMARK_ORIGIN);
  }
});

test("stored screenshots are retrievable PNG artifacts", async ({
  request,
}) => {
  const start = await request.post("/api/comparisons", {
    data: { scenarioId: "membership-balanced", goalIds: ["join", "leave"] },
  });
  expect(start.status()).toBe(202);
  const { comparisonId } = (await start.json()) as { comparisonId: string };

  const detail = await waitForTerminalComparison(request, comparisonId);
  expect(detail.comparison.status).toBe("completed");

  const firstJourney = detail.journeys[0];
  expect(firstJourney).toBeDefined();
  expect(firstJourney!.screenshots.length).toBeGreaterThan(0);

  for (const screenshot of firstJourney!.screenshots) {
    const response = await request.get(
      `/api/comparisons/${comparisonId}/artifacts/${screenshot.id}`,
    );
    expect(response.status(), screenshot.id).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");

    const bytes = await response.body();
    expect(bytes.byteLength, screenshot.id).toBeGreaterThan(1000);
    expect(Array.from(bytes.subarray(0, 4))).toEqual([137, 80, 78, 71]);
  }
});

test("run flow executes both consent-asymmetric goals and shows evidence", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page.goto("/");
  const scenarioRadio = page.getByRole("radio", {
    name: /Accept vs reject — asymmetric/,
  });
  await expect(scenarioRadio).toBeVisible();
  await scenarioRadio.check({ force: true });

  await page.getByRole("button", { name: "Run comparison" }).click();
  await page.waitForURL(/\/comparisons\/cmp_[a-f0-9]{16}/);

  // The detail page starts in "running" and polls until the controller
  // finishes both goals.
  await expect(
    page.getByRole("status").filter({ hasText: "Completed" }),
  ).toBeVisible({ timeout: 30_000 });

  const goalAPanel = page.getByRole("region", { name: "Goal A journey" });
  const goalBPanel = page.getByRole("region", { name: "Goal B journey" });
  await expect(goalAPanel.getByText("1 / 1 actions")).toBeVisible();
  await expect(goalBPanel.getByText("3 / 3 actions")).toBeVisible();

  for (const panel of [goalAPanel, goalBPanel]) {
    await expect(panel.getByText("Ordered events")).toBeVisible();
    const firstImage = panel.locator("img").first();
    await expect(firstImage).toBeAttached();
    await firstImage.scrollIntoViewIfNeeded();
    await expect
      .poll(() => firstImage.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
});

test("invalid and missing inputs are rejected without side effects", async ({
  request,
}) => {
  const missingGoalIds = await request.post("/api/comparisons", {
    data: { scenarioId: "membership-balanced" },
  });
  expect(missingGoalIds.status()).toBe(400);
  expect(await missingGoalIds.json()).toEqual({
    error: "Invalid comparison request.",
  });

  // Goal order is pinned to the catalog: a reversed pair stays invalid.
  const reversedGoals = await request.post("/api/comparisons", {
    data: { scenarioId: "membership-balanced", goalIds: ["leave", "join"] },
  });
  expect(reversedGoals.status()).toBe(400);
  expect(await reversedGoals.json()).toEqual({
    error: "Invalid comparison request.",
  });

  const missingComparison = await request.get(
    "/api/comparisons/cmp_0000000000000000",
  );
  expect(missingComparison.status()).toBe(404);
  expect(await missingComparison.json()).toEqual({
    error: "Comparison not found.",
  });

  const missingArtifact = await request.get(
    "/api/comparisons/cmp_0000000000000000/artifacts/nope.png",
  );
  expect(missingArtifact.status()).toBe(404);

  const traversalArtifact = await request.get(
    "/api/comparisons/cmp_0000000000000000/artifacts/..%2f..%2frecord.json",
  );
  expect(traversalArtifact.status()).toBe(404);
});

test("an extra origin key cannot steer navigation off the benchmark", async ({
  request,
}) => {
  const start = await request.post("/api/comparisons", {
    data: {
      scenarioId: "membership-balanced",
      goalIds: ["join", "leave"],
      origin: "https://evil.example",
    },
  });
  // The request schema strips unknown keys; an outright rejection is an
  // equally valid boundary outcome. Neither can inject an origin.
  expect([202, 400]).toContain(start.status());
  if (start.status() !== 202) {
    return;
  }

  const { comparisonId } = (await start.json()) as { comparisonId: string };
  const detail = await waitForTerminalComparison(request, comparisonId);
  expect(detail.comparison.status).toBe("completed");

  for (const journey of detail.journeys) {
    expect(journey.origin).toBe(BENCHMARK_ORIGIN);
  }
});

test("concurrent start requests are single-flight: one 202, one 429", async ({
  request,
}) => {
  const payload = {
    scenarioId: "membership-balanced",
    goalIds: ["join", "leave"],
  };

  const [first, second] = await Promise.all([
    request.post("/api/comparisons", { data: payload }),
    request.post("/api/comparisons", { data: payload }),
  ]);

  const statuses = [first.status(), second.status()].sort((a, b) => a - b);
  expect(statuses).toEqual([202, 429]);

  const rejected = first.status() === 429 ? first : second;
  expect(await rejected.json()).toEqual({
    error: "A comparison is already running.",
  });

  const accepted = first.status() === 202 ? first : second;
  const { comparisonId } = (await accepted.json()) as { comparisonId: string };
  const detail = await waitForTerminalComparison(request, comparisonId);
  expect(detail.comparison.status).toBe("completed");
  expect(detail.journeys).toHaveLength(2);
});
