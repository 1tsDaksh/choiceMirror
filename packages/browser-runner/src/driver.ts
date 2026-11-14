import { chromium } from "playwright";

import type { JourneyDriver, OpenJourney } from "./runner";
import { limits } from "./limits";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createPlaywrightOpenJourney(options: {
  origin: string;
  viewport?: { width: number; height: number };
}): OpenJourney {
  return async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({
        viewport: options.viewport ?? limits.VIEWPORT,
      });
      const page = await context.newPage();

      const driver: JourneyDriver = {
        async navigate(url) {
          await page.goto(url, { waitUntil: "load" });
        },
        async selectGoal(goalButtonName) {
          await page
            .getByRole("button", {
              name: new RegExp(escapeRegExp(goalButtonName)),
            })
            .click();
        },
        async clickAction(actionName) {
          await page
            .getByRole("button", { name: actionName, exact: true })
            .click();
        },
        async assertCompleted(expectedCount) {
          await page
            .getByRole("heading", { name: "Goal completed" })
            .waitFor({ state: "visible" });
          const text = await page
            .getByText(/^Completed in \d+ action/)
            .textContent();
          const expected = `Completed in ${expectedCount} action${
            expectedCount === 1 ? "" : "s"
          }. No data was submitted.`;
          if (text !== expected) {
            throw new Error(
              `Unexpected completion text: ${text ?? "(missing)"}`,
            );
          }
        },
        async screenshot() {
          return page.screenshot({ type: "png" });
        },
        async currentUrl() {
          return page.url();
        },
      };

      return {
        driver,
        close: async () => {
          try {
            await context.close();
          } catch {
            // Already closed.
          }
          try {
            await browser.close();
          } catch {
            // Already closed.
          }
        },
      };
    } catch (error) {
      try {
        await browser.close();
      } catch {
        // Launch failed before the browser was usable.
      }
      throw error;
    }
  };
}
