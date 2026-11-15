import { chromium } from "playwright";

import { isAllowedRequestUrl, sanitizeUrl } from "./allowlist";
import { BlockedError } from "./errors";
import { limits } from "./limits";
import type { JourneyDriver, OpenJourney } from "./runner";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cap on requests walked per chain; longer chains fail closed. */
const MAX_REDIRECT_HOPS = 20;

export function createPlaywrightOpenJourney(options: {
  origin: string;
  viewport?: { width: number; height: number };
}): OpenJourney {
  return async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({
        viewport: options.viewport ?? limits.VIEWPORT,
        // Service workers run outside page request interception; blocking
        // them keeps the context route the only path to the network.
        serviceWorkers: "block",
      });

      // Fail-closed interception installed before any page exists: every
      // request — navigation, subresource, click-initiated fetch, redirect
      // hop — must match the exact trusted origin or it is aborted in the
      // browser before a byte leaves. Blocked URLs are recorded without
      // query strings so error text can never leak them.
      const blockedRequests: string[] = [];
      const recordBlocked = (rawUrl: string): void => {
        const sanitized = sanitizeUrl(rawUrl);
        if (!blockedRequests.includes(sanitized)) {
          blockedRequests.push(sanitized);
        }
      };

      await context.route("**/*", async (route) => {
        const requestUrl = route.request().url();

        // Inert schemes cannot reach the network or redirect; pass through.
        if (
          requestUrl.startsWith("data:") ||
          requestUrl.startsWith("blob:") ||
          requestUrl.startsWith("about:")
        ) {
          await route.continue();
          return;
        }

        if (!isAllowedRequestUrl(requestUrl, options.origin)) {
          recordBlocked(requestUrl);
          await route.abort();
          return;
        }

        // Playwright routes each redirect chain only at its first request
        // (microsoft/playwright#34994), and native redirect hops do not
        // re-enter the handler either — so a chain like
        // /start -> /next -> https://evil would leave the browser unseen.
        // Walk the chain with fetch(maxRedirects: 0), validating the URL
        // of every hop, and abort before the browser sees any hop that
        // leaves the trusted origin: the redirect target is then contacted
        // by neither the browser nor this walk.
        try {
          let currentUrl = requestUrl;
          let settled = false;
          for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop += 1) {
            const response = await route.fetch({
              url: currentUrl,
              maxRedirects: 0,
            });
            const status = response.status();
            if (status < 300 || status >= 400) {
              settled = true; // Final response: every hop validated.
              break;
            }
            const location = response.headers()["location"];
            if (location === undefined) {
              settled = true; // Nothing to follow.
              break;
            }
            let target: string | undefined;
            try {
              target = new URL(location, currentUrl).toString();
            } catch {
              target = undefined;
            }
            if (
              target === undefined ||
              !isAllowedRequestUrl(target, options.origin)
            ) {
              recordBlocked(target ?? location);
              await route.abort();
              return;
            }
            currentUrl = target;
          }
          if (!settled) {
            // Longer than any legitimate fixture: fail closed.
            await route.abort();
            return;
          }
          // Deliver with continue(), never fulfill(): serving the fetched
          // response via route.fulfill() leaves the HTML byte-for-byte
          // identical yet silently breaks Next.js hydration (React never
          // attaches), while fetch-then-continue hydrates. The browser
          // therefore re-executes the validated chain from hop 1; hops 2+
          // are not re-routed, which is why the walk validated them first.
          await route.continue();
        } catch {
          // The trusted origin was unreachable (or the route was already
          // handled): fail closed rather than let the request proceed
          // uninspected.
          try {
            await route.abort();
          } catch {
            // Already handled; nothing left to do.
          }
        }
      });

      const page = await context.newPage();

      const blockedError = (): BlockedError =>
        new BlockedError(`Blocked off-origin request to ${blockedRequests[0]}.`);

      const assertNoBlockedRequests = (): void => {
        if (blockedRequests.length > 0) {
          throw blockedError();
        }
      };

      /**
       * Runs one driver operation, converting any failure that coincided with
       * a blocked off-origin request into `BlockedError` so the journey is
       * marked `blocked` (not `failed`/`timeout`) — and failing the operation
       * even when it "succeeded" if a violation was recorded meanwhile.
       */
      const withOriginGuard = async <T>(operation: () => Promise<T>): Promise<T> => {
        try {
          const value = await operation();
          assertNoBlockedRequests();
          return value;
        } catch (error) {
          if (error instanceof BlockedError) {
            throw error;
          }
          if (blockedRequests.length > 0) {
            throw blockedError();
          }
          throw error;
        }
      };

      const driver: JourneyDriver = {
        async navigate(url) {
          // Defense in depth: refuse to even attempt a URL outside the
          // trusted origin, then rely on interception for everything the
          // page does after loading.
          if (!isAllowedRequestUrl(url, options.origin)) {
            throw new BlockedError(
              `Blocked off-origin request to ${sanitizeUrl(url)}.`,
            );
          }
          await withOriginGuard(() => page.goto(url, { waitUntil: "load" }));
        },
        async selectGoal(goalButtonName) {
          await withOriginGuard(() =>
            page
              .getByRole("button", {
                name: new RegExp(escapeRegExp(goalButtonName)),
              })
              .click(),
          );
        },
        async clickAction(actionName) {
          await withOriginGuard(() =>
            page.getByRole("button", { name: actionName, exact: true }).click(),
          );
        },
        async assertCompleted(expectedCount) {
          await withOriginGuard(async () => {
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
          });
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
