import { describe, expect, it, vi } from "vitest";

import { scenarios } from "@choicemirror/contracts";

import { loadScenarios } from "./load-scenarios";

describe("loadScenarios", () => {
  it("returns the parsed catalog on a successful response", async () => {
    const fetchImpl = vi.fn(async () => Response.json(scenarios));

    const result = await loadScenarios(fetchImpl);

    expect(result).toEqual({ status: "ready", scenarios });
    expect(fetchImpl).toHaveBeenCalledWith("/api/scenarios");
  });

  it("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("unavailable", { status: 500 }),
    );

    expect(await loadScenarios(fetchImpl)).toEqual({ status: "error" });
  });

  it("returns empty for a valid but empty catalog", async () => {
    const fetchImpl = vi.fn(async () => Response.json([]));

    expect(await loadScenarios(fetchImpl)).toEqual({ status: "empty" });
  });

  it("returns an error for invalid JSON", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("{", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    expect(await loadScenarios(fetchImpl)).toEqual({ status: "error" });
  });

  it("returns an error for a schema-invalid payload", async () => {
    const fetchImpl = vi.fn(async () => Response.json([{ id: "bogus" }]));

    expect(await loadScenarios(fetchImpl)).toEqual({ status: "error" });
  });
});
