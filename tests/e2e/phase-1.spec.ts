import {
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

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

async function tabUntilFocused(
  page: Page,
  locator: Locator,
  maxTabs = 30,
): Promise<void> {
  const isFocused = () =>
    locator
      .evaluate((element) => element === document.activeElement)
      .catch(() => false);

  for (let tabs = 0; tabs < maxTabs; tabs += 1) {
    if (await isFocused()) {
      return;
    }
    await page.keyboard.press("Tab");
  }

  if (!(await isFocused())) {
    throw new Error("Tab navigation never reached the target control");
  }
}

async function expectVisibleFocusRing(locator: Locator): Promise<void> {
  await expect(locator).toBeFocused();
  const outline = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).not.toBe("0px");
}

function startHeadingFor(scenarioId: string): string {
  return scenarioId.startsWith("membership")
    ? "Choose your membership action"
    : "Choose your preference action";
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

test("launcher selects a controlled scenario and offers a working run action", async ({
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
  await expect(runButton).toBeEnabled();
  await expect(
    page.getByText(
      "Runs execute locally against the benchmark app with fixed limits.",
    ),
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

test("fixed seed reset and same-seed reload restore the starting state", async ({
  page,
}) => {
  await page.goto(`${BENCHMARK_ORIGIN}/membership-asymmetric?seed=phase-1`);
  await expect(
    page.getByRole("heading", { name: "Choose your membership action" }),
  ).toBeVisible();
  await expect(page.getByText("seed:")).toContainText("phase-1");

  await page.getByRole("button", { name: /Leave the synthetic workspace/ }).click();
  await page.getByRole("button", { name: "Review the leaving notice" }).click();
  await page.getByRole("button", { name: "Confirm the membership choice" }).click();

  await page.getByRole("button", { name: "Reset to starting state" }).click();

  await expect(
    page.getByRole("heading", { name: "Choose your membership action" }),
  ).toBeVisible();
  await expect(page.getByText("seed:")).toContainText("phase-1");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Choose your membership action" }),
  ).toBeVisible();
  await expect(page.getByText("seed:")).toContainText("phase-1");

  await page.getByRole("button", { name: /Leave the synthetic workspace/ }).click();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
});

test("scenario selection is operable by keyboard with a visible focus ring", async ({
  page,
}) => {
  await page.goto("/");

  const scenarioRadio = page.getByRole("radio", {
    name: /Join vs leave — balanced/,
  });
  await tabUntilFocused(page, scenarioRadio);

  const labelOutline = await scenarioRadio.evaluate((element) => {
    const label = element.closest("label");
    const style = label ? window.getComputedStyle(label) : null;
    return style
      ? { style: style.outlineStyle, width: style.outlineWidth }
      : null;
  });
  expect(labelOutline).not.toBeNull();
  expect(labelOutline?.style).not.toBe("none");
  expect(labelOutline?.width).not.toBe("0px");

  await page.keyboard.press("Space");
  await expect(scenarioRadio).toBeChecked();

  await expect(
    page.getByRole("heading", { name: "Join vs leave — balanced" }),
  ).toBeVisible();
  await expect(page.getByText("Goal A", { exact: true })).toBeVisible();
  await expect(page.getByText("Goal B", { exact: true })).toBeVisible();
});

test("every goal completes by keyboard and keyboard reset restores the start", async ({
  page,
}) => {
  for (const flowCase of flowCases) {
    await page.goto(`${BENCHMARK_ORIGIN}/${flowCase.scenarioId}?seed=phase-1`);

    const startGoal = page.getByRole("button", {
      name: flowCase.goalButtonPattern,
    });
    await tabUntilFocused(page, startGoal);
    await expectVisibleFocusRing(startGoal);
    await page.keyboard.press("Enter");

    for (const [index, action] of flowCase.actions.entries()) {
      const actionButton = page.getByRole("button", {
        name: action,
        exact: true,
      });
      await tabUntilFocused(page, actionButton);
      if (index === 0) {
        await expectVisibleFocusRing(actionButton);
      }
      await page.keyboard.press("Enter");
    }

    await expect(
      page.getByRole("heading", { name: "Goal completed" }),
    ).toBeVisible();

    const resetButton = page.getByRole("button", {
      name: "Reset to starting state",
    });
    await tabUntilFocused(page, resetButton);
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", {
        name: startHeadingFor(flowCase.scenarioId),
      }),
    ).toBeVisible();
  }
});

test("unknown and malformed scenario IDs return a controlled 404", async ({
  page,
}) => {
  const externalRequests = trackExternalRequests(page);

  const singleSegmentIds = [
    "unknown-scenario",
    "Membership-Balanced",
    "membership%20balanced",
    "..%2fjunk",
    "x".repeat(200),
  ];

  for (const id of singleSegmentIds) {
    const response = await page.goto(`${BENCHMARK_ORIGIN}/${id}`);
    expect(response?.status(), `status for /${id}`).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Unknown benchmark scenario" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Join vs leave/ }),
    ).toHaveCount(0);
  }

  const multiSegmentResponse = await page.goto(`${BENCHMARK_ORIGIN}/a/b/c`);
  expect(multiSegmentResponse?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: /Join vs leave/ }),
  ).toHaveCount(0);

  expect(externalRequests).toEqual([]);
});

test("missing comparison IDs show an honest unavailable state", async ({
  page,
}) => {
  // The segment's loading.tsx streams the shell before notFound() runs, so
  // Next.js keeps status 200 and injects noindex (documented Next 16 behavior).
  // The plan requires the honest visible state for this page; the hard 404
  // status is pinned for benchmark scenario IDs, which have no loading shell.
  const response = await page.goto("/comparisons/not-a-real-run");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { name: "No stored comparison" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This ID has no stored run. Start a comparison from the scenario launcher to capture evidence.",
    ),
  ).toBeVisible();
  await expect(
    page.locator('meta[name="robots"][content="noindex"]').first(),
  ).toHaveCount(1);
});

test("fixture index lists every controlled fixture without external requests", async ({
  page,
}) => {
  const externalRequests = trackExternalRequests(page);

  const response = await page.goto(BENCHMARK_ORIGIN);
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", {
      name: "Explore both sides of a controlled choice",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Open fixture/ })).toHaveCount(
    6,
  );
  expect(externalRequests).toEqual([]);
});
