import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function comparisonRequest(body: unknown): Request {
  return new Request("http://localhost/api/comparisons", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/comparisons", () => {
  it("returns an honest unavailable response without starting work", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      comparisonRequest({
        scenarioId: "membership-balanced",
        goalIds: ["join", "leave"],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "Browser runner is not available in Phase 1.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("rejects malformed requests without starting work", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const missingScenario = await POST(
      comparisonRequest({ goalIds: ["join", "leave"] }),
    );
    const wrongGoalCount = await POST(
      comparisonRequest({
        scenarioId: "membership-balanced",
        goalIds: ["join"],
      }),
    );
    const mismatchedGoals = await POST(
      comparisonRequest({
        scenarioId: "membership-balanced",
        goalIds: ["join", "accept"],
      }),
    );

    expect(missingScenario.status).toBe(400);
    expect(wrongGoalCount.status).toBe(400);
    expect(mismatchedGoals.status).toBe(400);
    expect(await missingScenario.json()).toEqual({
      error: "Invalid comparison request.",
    });
    expect(await wrongGoalCount.json()).toEqual({
      error: "Invalid comparison request.",
    });
    expect(await mismatchedGoals.json()).toEqual({
      error: "Invalid comparison request.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
