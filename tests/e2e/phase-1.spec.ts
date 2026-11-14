import { expect, test, type Page } from "@playwright/test";

const BENCHMARK_ORIGIN = "http://localhost:3001";

type FlowCase = {
  scenarioId: string;
  goalButtonPattern: RegExp;
  actions: string[];
};

const flowCases: FlowCase[] = [
  {
    scenarioId: "membership-balanced",
    goalButtonPattern: /Join the synthetic workspace/,
    actions: ["Join workspace"],
  },
  {
    scenarioId: "membership-balanced",
    goalButtonPattern: /Leave the synthetic workspace/,
    actions: ["Leave workspace"],
  },
  {
    scenarioId: "membership-asymmetric",
    goalButtonPattern: /Join the synthetic workspace/,
    actions: ["Join workspace"],
  },
  {
    scenarioId: "membership-asymmetric",
    goalButtonPattern: /Leave the synthetic workspace/,
    actions: [
      "Review the leaving notice",
      "Confirm the membership choice",
      "Leave workspace",
    ],
  },
  {
    scenarioId: "consent-balanced",
    goalButtonPattern: /Accept the synthetic preference/,
    actions: ["Accept preference"],
  },
  {
    scenarioId: "consent-balanced",
    goalButtonPattern: /Reject the synthetic preference/,
    actions: ["Reject preference"],
  },
  {
    scenarioId: "consent-asymmetric",
    goalButtonPattern: /Accept the synthetic preference/,
    actions: ["Accept preference"],
  },
  {
    scenarioId: "consent-asymmetric",
    goalButtonPattern: /Reject the synthetic preference/,
    actions: [
      "Review the rejection notice",
      "Confirm the preference choice",
      "Reject preference",
    ],
  },
];

function trackExternalRequests(page: Page): string[] {
  const externalRequests: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1"
    ) {
      externalRequests.push(request.url());
    }
  });

  return externalRequests;
}

async function completeFlow(
  page: Page,
  scenarioId: string,
  goalButtonPattern: RegExp,
  actions: string[],
): Promise<void> {
  await page.goto(`${BENCHMARK_ORIGIN}/${scenarioId}?seed=phase-1`);
  await page.getByRole("button", { name: goalButtonPattern }).click();

  for (const [index, action] of actions.entries()) {
    await page.getByRole("button", { name: action, exact: true }).click();
    const completedSteps = index + 1;
    const expectedProgress = Math.round(
      (completedSteps / actions.length) * 100,
    );

    await expect(
      page.getByRole("progressbar", { name: /progress$/ }),
    ).toHaveAttribute("aria-valuenow", String(expectedProgress));
  }

  await expect(page.getByRole("heading", { name: "Goal completed" })).toBeVisible();
  await expect(page.getByText(/Completed in \d+ action/)).toHaveText(
    `Completed in ${actions.length} action${actions.length === 1 ? "" : "s"}. No data was submitted.`,
  );
}

test("launcher selects a controlled scenario and keeps automated runs disabled", async ({
  page,
}) => {
  const externalRequests = trackExternalRequests(page);

  await page.goto("/");
  const scenarioRadio = page.getByRole("radio", {
    name: /Join vs leave — balanced/,
  });
  await expect(scenarioRadio).toBeVisible();
  await scenarioRadio.check({ force: true });

  await expect(
    page.getByRole("heading", { name: "Join vs leave — balanced" }),
  ).toBeVisible();
  await expect(page.getByText("Goal A", { exact: true })).toBeVisible();
  await expect(page.getByText("Goal B", { exact: true })).toBeVisible();

  const runButton = page.getByRole("button", { name: "Run comparison" });
  await expect(runButton).toBeDisabled();
  await expect(
    page.getByText("The browser runner arrives in Phase 2"),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "Explore manually in benchmark →",
    }),
  ).toHaveAttribute(
    "href",
    "http://localhost:3001/membership-balanced?seed=phase-1",
  );
  expect(externalRequests).toEqual([]);
});

test("every controlled goal completes with its documented action count", async ({
  page,
}) => {
  for (const flowCase of flowCases) {
    await completeFlow(
      page,
      flowCase.scenarioId,
      flowCase.goalButtonPattern,
      flowCase.actions,
    );
  }
});

test("fixed seed reset returns every goal to the starting state", async ({
  page,
}) => {
  await page.goto(`${BENCHMARK_ORIGIN}/membership-asymmetric?seed=phase-1`);
  await expect(page.getByText("seed:")).toContainText("phase-1");

  await page.getByRole("button", { name: /Leave the synthetic workspace/ }).click();
  await page.getByRole("button", { name: "Review the leaving notice" }).click();
  await page.getByRole("button", { name: "Confirm the membership choice" }).click();

  await page.getByRole("button", { name: "Reset to starting state" }).click();

  await expect(
    page.getByRole("heading", { name: "Choose your membership action" }),
  ).toBeVisible();
  await expect(page.getByText("seed:")).toContainText("phase-1");

  await page.getByRole("button", { name: /Leave the synthetic workspace/ }).click();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
});

test("scenario selection and a goal are operable by keyboard", async ({
  page,
}) => {
  await page.goto("/");

  const scenarioRadio = page.getByRole("radio", {
    name: /Join vs leave — balanced/,
  });
  await scenarioRadio.press("Space");
  await expect(scenarioRadio).toBeChecked();

  await page.goto(`${BENCHMARK_ORIGIN}/membership-balanced?seed=phase-1`);

  const startGoal = page.getByRole("button", {
    name: /Join the synthetic workspace/,
  });
  await startGoal.press("Enter");

  const actionButton = page.getByRole("button", {
    name: "Join workspace",
    exact: true,
  });
  await actionButton.press("Enter");

  await expect(page.getByRole("heading", { name: "Goal completed" })).toBeVisible();
});

test("unknown scenario and comparison IDs show honest unavailable states", async ({
  page,
}) => {
  await page.goto(`${BENCHMARK_ORIGIN}/unknown-scenario`);
  await expect(
    page.getByRole("heading", { name: "Unknown benchmark scenario" }),
  ).toBeVisible();

  await page.goto("/comparisons/not-a-real-run");
  await expect(
    page.getByRole("heading", { name: "No stored comparison" }),
  ).toBeVisible();
  await expect(
    page.getByText("Automated execution and evidence capture arrive with Phase 2."),
  ).toBeVisible();
});
