import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { JourneyPlan } from "@choicemirror/contracts";
import { expect, test } from "@playwright/test";

import { runJourney } from "@choicemirror/browser-runner";

const comparisonId = "cmp_0123456789abcdef";

type TestServer = {
  origin: string;
  hits: string[];
  close(): Promise<void>;
};

async function startServer(
  handler: (
    url: string,
    respond: (status: number, headers: Record<string, string>, body: string) => void,
  ) => void,
): Promise<TestServer> {
  const hits: string[] = [];
  const server: Server = createServer((req, res) => {
    const url = req.url ?? "/";
    hits.push(url);
    handler(url, (status, headers, body) => {
      res.writeHead(status, headers);
      res.end(body);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;

  return {
    origin: `http://127.0.0.1:${port}`,
    hits,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/** Journey whose fixture page (or redirect) tries to reach the external server. */
function trapPlan(path: string): JourneyPlan {
  return {
    scenarioId: "membership-balanced",
    path,
    goalId: "join",
    goalButtonName: "Join the synthetic workspace",
    actions: [],
    expectedActionCount: 0,
  };
}

function pathOf(url: string): string {
  return (url.split("?")[0] ?? "/").split("#")[0] ?? "/";
}

test("an off-origin subresource request is prevented before leaving the browser", async () => {
  const external = await startServer((url, respond) => {
    respond(200, { "content-type": "image/gif" }, "GIF89a");
  });
  const trusted = await startServer((url, respond) => {
    if (pathOf(url) === "/external-image.html") {
      respond(
        200,
        { "content-type": "text/html; charset=utf-8" },
        `<!doctype html><html><head><title>trap</title></head><body><p>trusted page</p><img src="${external.origin}/pixel.gif?secret=abc" alt="trap"></body></html>`,
      );
      return;
    }
    respond(404, { "content-type": "text/plain" }, "not found");
  });

  try {
    const result = await runJourney({
      comparisonId,
      plan: trapPlan("/external-image.html"),
      origin: trusted.origin,
      seed: "phase-2",
    });

    // The journey is honestly marked blocked, with query-free evidence...
    expect(result.status).toBe("blocked");
    expect(result.error).toContain("Blocked off-origin request to");
    expect(result.error).toContain(`${external.origin}/pixel.gif`);
    expect(result.error).not.toContain("secret");

    // ...and the external server never received the request: it was aborted
    // at the request layer, not merely recognized after the fact.
    expect(external.hits).toHaveLength(0);
    expect(trusted.hits.some((url) => pathOf(url) === "/external-image.html")).toBe(
      true,
    );
  } finally {
    await trusted.close();
    await external.close();
  }
});

test("an off-origin redirect is prevented and never executed", async () => {
  const external = await startServer((url, respond) => {
    respond(200, { "content-type": "text/html; charset=utf-8" }, "<html>landed</html>");
  });
  const trusted = await startServer((url, respond) => {
    if (pathOf(url) === "/redirect") {
      respond(302, { location: `${external.origin}/land?secret=abc` }, "");
      return;
    }
    respond(404, { "content-type": "text/plain" }, "not found");
  });

  try {
    const result = await runJourney({
      comparisonId,
      plan: trapPlan("/redirect"),
      origin: trusted.origin,
      seed: "phase-2",
    });

    expect(result.status).toBe("blocked");
    expect(result.error).toContain("Blocked off-origin request to");
    expect(result.error).not.toContain("secret");
    expect(external.hits).toHaveLength(0);
  } finally {
    await trusted.close();
    await external.close();
  }
});

test("a redirect chain is validated hop by hop, not just at its first request", async () => {
  const external = await startServer((url, respond) => {
    respond(200, { "content-type": "text/html; charset=utf-8" }, "<html>landed</html>");
  });
  // Same-origin first hop, off-origin second hop: Playwright routes only
  // the first request of a chain, so the second hop must be caught by the
  // handler's own redirect walk.
  const trusted = await startServer((url, respond) => {
    if (pathOf(url) === "/chain") {
      respond(302, { location: "/hop2" }, "");
      return;
    }
    if (pathOf(url) === "/hop2") {
      respond(302, { location: `${external.origin}/land?secret=abc` }, "");
      return;
    }
    respond(404, { "content-type": "text/plain" }, "not found");
  });

  try {
    const result = await runJourney({
      comparisonId,
      plan: trapPlan("/chain"),
      origin: trusted.origin,
      seed: "phase-2",
    });

    expect(result.status).toBe("blocked");
    expect(result.error).toContain("Blocked off-origin request to");
    expect(result.error).not.toContain("secret");
    // The walk itself followed the same-origin hop...
    expect(trusted.hits.some((url) => pathOf(url) === "/chain")).toBe(true);
    expect(trusted.hits.some((url) => pathOf(url) === "/hop2")).toBe(true);
    // ...but the off-origin target was never contacted.
    expect(external.hits).toHaveLength(0);
  } finally {
    await trusted.close();
    await external.close();
  }
});
