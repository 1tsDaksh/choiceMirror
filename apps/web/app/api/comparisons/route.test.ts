import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startComparisonRun: vi.fn(async (): Promise<void> => {}),
  saveComparison: vi.fn(),
  getComparison: vi.fn(),
  saveJourney: vi.fn(),
  getJourneys: vi.fn(),
  saveScreenshot: vi.fn(),
  getScreenshot: vi.fn(),
}));

// Partial mock: the single-flight reservation functions must stay REAL so the
// concurrency test exercises the actual atomic check-and-set, not a stub.
vi.mock("../../../lib/run-comparison", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../lib/run-comparison")>();
  return {
    ...actual,
    startComparisonRun: mocks.startComparisonRun,
  };
});

vi.mock("@choicemirror/browser-runner", () => ({
  runJourney: vi.fn(),
  createPlaywrightOpenJourney: vi.fn(() => vi.fn()),
  limits: {
    MAX_ACTIONS: 10,
    STEP_TIMEOUT_MS: 10_000,
    JOURNEY_TIMEOUT_MS: 60_000,
    VIEWPORT: { width: 1280, height: 720 },
  },
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

import {
  activeComparisonId,
  releaseRun,
  tryReserveRun,
} from "../../../lib/run-comparison";
import { POST } from "./route";

function comparisonRequest(body: unknown): Request {
  return new Request("http://localhost/api/comparisons", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  scenarioId: "membership-balanced",
  goalIds: ["join", "leave"],
};

describe("POST /api/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // The stubbed startComparisonRun never releases the reservation; free it
    // so tests stay independent.
    const held = activeComparisonId();
    if (held !== null) {
      releaseRun(held);
    }
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

  it("returns 429 while another comparison holds the reservation", async () => {
    expect(tryReserveRun("cmp_ffffffffffffffff")).toBe(true);

    const response = await POST(comparisonRequest(validBody));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "A comparison is already running.",
    });
    expect(mocks.startComparisonRun).not.toHaveBeenCalled();
    expect(mocks.saveComparison).not.toHaveBeenCalled();
  });

  it("accepts exactly one of two concurrent start requests", async () => {
    // Slow the save so a check-then-act guard would let both requests through;
    // the atomic reservation must reject the second before it reaches the store.
    mocks.saveComparison.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });

    const [first, second] = await Promise.all([
      POST(comparisonRequest(validBody)),
      POST(comparisonRequest(validBody)),
    ]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([202, 429]);
    expect(mocks.saveComparison).toHaveBeenCalledTimes(1);
    expect(mocks.startComparisonRun).toHaveBeenCalledTimes(1);
  });

  it("releases the reservation when the record cannot be saved", async () => {
    mocks.saveComparison.mockRejectedValueOnce(new Error("disk full"));

    const failed = await POST(comparisonRequest(validBody));
    expect(failed.status).toBe(500);
    expect(await failed.json()).toEqual({
      error: "Comparison could not be started.",
    });
    expect(activeComparisonId()).toBeNull();

    // The slot is free again: the next valid request must start normally.
    const retry = await POST(comparisonRequest(validBody));
    expect(retry.status).toBe(202);
    expect(mocks.startComparisonRun).toHaveBeenCalledTimes(1);
  });
});
