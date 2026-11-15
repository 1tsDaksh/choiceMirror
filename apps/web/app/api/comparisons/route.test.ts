import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasActiveRun: vi.fn(() => false),
  startComparisonRun: vi.fn(async (): Promise<void> => {}),
  saveComparison: vi.fn(),
  getComparison: vi.fn(),
  saveJourney: vi.fn(),
  getJourneys: vi.fn(),
  saveScreenshot: vi.fn(),
  getScreenshot: vi.fn(),
}));

vi.mock("../../../lib/run-comparison", () => ({
  hasActiveRun: mocks.hasActiveRun,
  startComparisonRun: mocks.startComparisonRun,
}));

vi.mock("../../../lib/comparison-store", () => ({
  getStore: () => ({
    getComparison: mocks.getComparison,
    saveComparison: mocks.saveComparison,
    saveJourney: mocks.saveJourney,
    getJourneys: mocks.getJourneys,
    saveScreenshot: mocks.saveScreenshot,
    getScreenshot: mocks.getScreenshot,
  }),
}));

import { POST } from "./route";

function comparisonRequest(body: unknown): Request {
  return new Request("http://localhost/api/comparisons", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasActiveRun.mockReturnValue(false);
  });

  it("starts a paired comparison and returns 202 with the new id", async () => {
    const response = await POST(
      comparisonRequest({
        scenarioId: "membership-balanced",
        goalIds: ["join", "leave"],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.comparisonId).toMatch(/^cmp_[a-f0-9]{16}$/);
    expect(body.status).toBe("running");

    expect(mocks.saveComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        id: body.comparisonId,
        scenarioId: "membership-balanced",
        goalIds: ["join", "leave"],
        seed: "phase-2",
        status: "running",
        createdAt: expect.any(String),
      }),
    );
    expect(mocks.startComparisonRun).toHaveBeenCalledWith(body.comparisonId);
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

  it("returns 429 while another comparison is running", async () => {
    mocks.hasActiveRun.mockReturnValue(true);

    const response = await POST(
      comparisonRequest({
        scenarioId: "membership-balanced",
        goalIds: ["join", "leave"],
      }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "A comparison is already running.",
    });
    expect(mocks.startComparisonRun).not.toHaveBeenCalled();
    expect(mocks.saveComparison).not.toHaveBeenCalled();

    mocks.hasActiveRun.mockReturnValue(false);
  });
});
