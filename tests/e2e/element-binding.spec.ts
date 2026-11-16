import { expect, test } from "@playwright/test";

import {
  createPlaywrightOpenJourney,
  type AiJourneyDriver,
} from "@choicemirror/browser-runner";

const BENCHMARK_ORIGIN = "http://localhost:3001";

/**
 * Regression coverage for the review-blocking invariant: an observation id
 * must activate the exact element it was assigned to, never whatever now
 * occupies an index in a differently-filtered population. The fixture puts
 * a hidden same-label control first in DOM order, which shifts any
 * occurrence count computed without a visibility filter.
 */
async function withFixtureDriver(
  run: (driver: AiJourneyDriver) => Promise<void>,
): Promise<void> {
  const open = createPlaywrightOpenJourney({ origin: BENCHMARK_ORIGIN });
  const { driver, close } = await open();
  try {
    await driver.navigate(`${BENCHMARK_ORIGIN}/element-binding`);
    await run(driver);
  } finally {
    await close();
  }
}

test("hidden duplicates never receive ids and each id activates its own control", async () => {
  test.setTimeout(60_000);

  await withFixtureDriver(async (driver) => {
    const initial = await driver.observe();

    // The hidden control is invisible to the observation: only the two
    // visible same-name buttons and the aria-labelled one exist.
    const visibleContinues = initial.elements.filter(
      (element) => element.name === "Continue",
    );
    expect(visibleContinues).toHaveLength(2);
    expect(visibleContinues.map((element) => element.occurrence)).toEqual([
      0, 1,
    ]);

    // Nontrivial accessible name: aria-label wins over the inner text.
    const labelled = initial.elements.find(
      (element) => element.name === "Save the current draft",
    );
    expect(labelled).toBeDefined();

    const indexOf = (name: string, occurrence: number): string => {
      const index = initial.elements.findIndex(
        (element) => element.name === name && element.occurrence === occurrence,
      );
      expect(index, `${name}#${occurrence}`).toBeGreaterThanOrEqual(0);
      return `element-${index}`;
    };

    // Click the SECOND visible same-name button: with the old
    // getByRole().nth(occurrence) re-resolution the hidden control shifted
    // this id onto the wrong node (or off the list entirely).
    await driver.clickElement(indexOf("Continue", 1));
    let state = await driver.observe();
    expect(state.text).toContain("first=0 second=1 hidden=0 labelled=0");

    await driver.clickElement(indexOf("Continue", 0));
    state = await driver.observe();
    expect(state.text).toContain("first=1 second=1 hidden=0 labelled=0");

    await driver.clickElement(
      `element-${initial.elements.indexOf(labelled!)}`,
    );
    state = await driver.observe();
    expect(state.text).toContain("first=1 second=1 hidden=0 labelled=1");

    // The hidden control was never activated by any of the clicks above.
    expect(state.text).not.toContain("hidden=1");
  });
});

test("unknown or malformed element ids are rejected before any click", async () => {
  test.setTimeout(60_000);

  await withFixtureDriver(async (driver) => {
    await driver.observe();

    await expect(driver.clickElement("element-999")).rejects.toThrow(
      "Unknown element id.",
    );
    await expect(driver.clickElement("not-an-id")).rejects.toThrow(
      "Unknown element id.",
    );

    // Nothing was activated by the rejected attempts.
    const state = await driver.observe();
    expect(state.text).toContain("first=0 second=0 hidden=0 labelled=0");
  });
});
