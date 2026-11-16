import type { ComparisonRecord } from "@choicemirror/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const comparisonId = "cmp_ab12cd34ef567890";
const origin = "http://benchmark.test";

const mocks = vi.hoisted(() => ({
  runJourney: vi.fn(),
  runAiJourney: vi.fn(),
  createAiAgent: vi.fn(),
  aiModelId: vi.fn(),
  getComparison: vi.fn(),
  saveComparison: vi.fn(),
  saveJourney: vi.fn(),
  saveScreenshot: vi.fn(),
}));

vi.mock("@choicemirror/browser-runner", () => ({
  runJourney: mocks.runJourney,
  runAiJourney: mocks.runAiJourney,
  createPlaywrightOpenJourney: vi.fn(() => vi.fn()),
  limits: {
    MAX_ACTIONS: 10,
    STEP_TIMEOUT_MS: 10_000,
    JOURNEY_TIMEOUT_MS: 60_000,
    VIEWPORT: { width: 1280, height: 720 },
  },
}));

vi.mock("./ai-agent", () => ({
  isAiConfigured: vi.fn(() => true),
  createAiAgent: mocks.createAiAgent,
  aiModelId: mocks.aiModelId,
}));

vi.mock("./comparison-store", () => ({
  getStore: () => ({
    getComparison: mocks.getComparison,
    saveComparison: mocks.saveComparison,
    saveJourney: mocks.saveJourney,
    saveScreenshot: mocks.saveScreenshot,
    getJourneys: vi.fn(),
    getScreenshot: vi.fn(),
  }),
}));

import {
  activeComparisonId,
  benchmarkOrigin,
  hasActiveRun,
  startComparisonRun,
} from "./run-comparison";

function runningRecord(): ComparisonRecord {
  return {
    id: comparisonId,
    scenarioId: "membership-balanced",
    goalIds: ["join", "leave"],
    seed: "phase-2",
    status: "running",
    createdAt: "2026-11-14T10:00:00.000Z",
  };
}

function aiRecord(): ComparisonRecord {
  return {
    ...runningRecord(),
    scenarioId: "membership-asymmetric",
    goalIds: ["join", "leave"],
    mode: "ai",
  };
}

function journeyResult(goalId: string) {
  const journeyId = `${comparisonId}-${goalId}`;
  return {
    status: "completed",
    events: [
      {
        stepNo: 0,
        timestamp: "2026-11-14T10:00:00.000Z",
        type: "navigate",
        label: "Open fixture",
        outcome: "success",
        countsAsAction: false,
      },
      {
        stepNo: 1,
        timestamp: "2026-11-14T10:00:01.000Z",
        type: "click",
        label: goalId,
        outcome: "success",
        countsAsAction: true,
      },
    ],
    actionCount: 1,
    startedAt: "2026-11-14T10:00:00.000Z",
    completedAt: "2026-11-14T10:00:02.000Z",
    screenshots: [
      {
        id: `${journeyId}-start.png`,
        label: "Starting state",
        bytes: Buffer.from([137, 80, 78, 71]),
      },
    ],
  };
}

const AI_SUMMARY = {
  provider: "nebius",
  model: "test-model",
  promptVersion: "phase3-v1",
  inferenceCalls: 3,
  inputTokens: 120,
  outputTokens: 45,
  rejectedProposals: 1,
  modelErrors: [],
} as const;

function aiJourneyResult(goalId: string) {
  return { ...journeyResult(goalId), ai: { ...AI_SUMMARY } };
}

function fakeAgent() {
  return {
    decide: vi.fn(),
    summary: vi.fn(() => ({ ...AI_SUMMARY, rejectedProposals: 0 })),
  };
}

describe("startComparisonRun", () => {
  beforeEach(() => {
    vi.stubEnv("BENCHMARK_ORIGIN", origin);
    mocks.runJourney.mockReset();
    mocks.runAiJourney.mockReset();
    mocks.createAiAgent.mockReset();
    mocks.aiModelId.mockReset();
    mocks.getComparison.mockReset();
    mocks.saveComparison.mockReset();
    mocks.saveJourney.mockReset();
    mocks.saveScreenshot.mockReset();
    mocks.getComparison.mockResolvedValue(runningRecord());
    mocks.runJourney.mockImplementation((options: { plan: { goalId: string } }) =>
      Promise.resolve(journeyResult(options.plan.goalId)),
    );
    mocks.runAiJourney.mockImplementation((options: { goalId: string }) =>
      Promise.resolve(aiJourneyResult(options.goalId)),
    );
    mocks.aiModelId.mockReturnValue("test-model");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs both goals sequentially from equivalent starting conditions", async () => {
    await startComparisonRun(comparisonId);

    expect(mocks.runJourney).toHaveBeenCalledTimes(2);

    const calls = mocks.runJourney.mock.calls.map((call) => call[0]);
    expect(calls.map((options) => options.plan.goalId)).toEqual([
      "join",
      "leave",
    ]);

    const [first, second] = calls;
    expect(first.comparisonId).toBe(comparisonId);
    expect(first.seed).toBe("phase-2");
    expect(first.origin).toBe(origin);
    expect(second.comparisonId).toBe(first.comparisonId);
    expect(second.seed).toBe(first.seed);
    expect(second.origin).toBe(first.origin);
    expect(typeof first.openJourney).toBe("function");
  });

  it("persists journeys and screenshots before completing the comparison", async () => {
    await startComparisonRun(comparisonId);

    expect(mocks.saveJourney).toHaveBeenCalledTimes(2);
    const journeys = mocks.saveJourney.mock.calls.map((call) => call[0]);
    expect(journeys.map((journey) => journey.goalId)).toEqual([
      "join",
      "leave",
    ]);
    expect(journeys.every((journey) => journey.status === "completed")).toBe(
      true,
    );
    expect(journeys[0].screenshots).toEqual([
      { id: `${comparisonId}-join-start.png`, label: "Starting state" },
    ]);
    expect(journeys[0].origin).toBe(origin);
    expect(journeys[0].viewport).toEqual({ width: 1280, height: 720 });

    expect(mocks.saveScreenshot).toHaveBeenCalledWith(
      comparisonId,
      `${comparisonId}-join-start.png`,
      expect.anything(),
    );
    expect(mocks.saveScreenshot).toHaveBeenCalledWith(
      comparisonId,
      `${comparisonId}-leave-start.png`,
      expect.anything(),
    );

    expect(mocks.saveComparison).toHaveBeenCalledTimes(1);
    const finalRecord = mocks.saveComparison.mock.calls[0]![0];
    expect(finalRecord.id).toBe(comparisonId);
    expect(finalRecord.status).toBe("completed");
    expect(finalRecord.completedAt).toBeDefined();

    const lastJourneyOrder =
      mocks.saveJourney.mock.invocationCallOrder[
        mocks.saveJourney.mock.invocationCallOrder.length - 1
      ];
    const finalSaveOrder = mocks.saveComparison.mock.invocationCallOrder[0]!;
    expect(lastJourneyOrder).toBeLessThan(finalSaveOrder);
  });

  it("marks the comparison failed when a journey run rejects", async () => {
    mocks.runJourney.mockRejectedValueOnce(new Error("browser exploded"));

    await startComparisonRun(comparisonId);

    expect(mocks.runJourney).toHaveBeenCalledTimes(1);
    expect(mocks.saveJourney).not.toHaveBeenCalled();

    const failedRecord = mocks.saveComparison.mock.calls[0]![0];
    expect(failedRecord.status).toBe("failed");
    expect(failedRecord.error).toContain("browser exploded");
    expect(failedRecord.completedAt).toBeDefined();

    expect(hasActiveRun()).toBe(false);
    expect(activeComparisonId()).toBeNull();
  });

  it("holds the single-run guard for the whole execution", async () => {
    let release: (() => void) | undefined;
    let callCount = 0;
    mocks.runJourney.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise((resolve) => {
          release = () => resolve(journeyResult("join"));
        });
      }
      return Promise.resolve(journeyResult("leave"));
    });

    const run = startComparisonRun(comparisonId);

    expect(hasActiveRun()).toBe(true);
    expect(activeComparisonId()).toBe(comparisonId);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.runJourney).toHaveBeenCalled();
    release?.();

    await run;

    expect(hasActiveRun()).toBe(false);
    expect(activeComparisonId()).toBeNull();
  });

  it("runs ai mode with a fresh agent per goal and no plan in sight", async () => {
    const agent = fakeAgent();
    mocks.getComparison.mockResolvedValue(aiRecord());
    mocks.createAiAgent.mockReturnValue(agent);

    await startComparisonRun(comparisonId);

    expect(mocks.runJourney).not.toHaveBeenCalled();
    expect(mocks.runAiJourney).toHaveBeenCalledTimes(2);
    expect(mocks.createAiAgent).toHaveBeenCalledTimes(2);

    const calls = mocks.runAiJourney.mock.calls.map((call) => call[0]);
    expect(calls.map((options) => options.goalId)).toEqual(["join", "leave"]);
    // Goal text comes from the catalog — the model never sees a plan.
    expect(calls[0].goalDescription).toBe("Join the synthetic workspace.");
    expect(calls[1].goalDescription).toBe(
      "Leave the synthetic workspace through three review steps.",
    );
    expect(calls[1].path).toBe("/membership-asymmetric");
    expect(calls[0].expectedActionCount).toBe(1);
    expect(calls[1].expectedActionCount).toBe(3);
    expect(calls[0].decider).toBe(agent);
    expect(calls[1].decider).toBe(agent);
    expect(calls[0].aiMeta).toEqual({
      provider: "nebius",
      model: "test-model",
      promptVersion: "phase3-v1",
    });
    expect(calls.every((options) => options.seed === "phase-2")).toBe(true);
    expect(calls.every((options) => options.origin === origin)).toBe(true);
    expect(typeof calls[0].openJourney).toBe("function");

    const journeys = mocks.saveJourney.mock.calls.map((call) => call[0]);
    expect(journeys).toHaveLength(2);
    expect(journeys.every((journey) => journey.mode === "ai")).toBe(true);
    expect(journeys[0].ai).toEqual(AI_SUMMARY);
    expect(journeys[1].ai).toEqual(AI_SUMMARY);
    expect(journeys[1].expectedActionCount).toBe(3);

    const finalRecord = mocks.saveComparison.mock.calls[0]![0];
    expect(finalRecord.status).toBe("completed");
    expect(finalRecord.mode).toBe("ai");
  });

  it("persists deterministic mode when the record carries no mode", async () => {
    await startComparisonRun(comparisonId);

    expect(mocks.runAiJourney).not.toHaveBeenCalled();
    expect(mocks.runJourney).toHaveBeenCalledTimes(2);

    const journeys = mocks.saveJourney.mock.calls.map((call) => call[0]);
    expect(journeys).toHaveLength(2);
    expect(
      journeys.every((journey) => journey.mode === "deterministic"),
    ).toBe(true);
    expect(journeys.every((journey) => journey.ai === undefined)).toBe(true);
  });

  it("fails honestly when ai mode loses its configuration mid-flight", async () => {
    const agent = fakeAgent();
    mocks.getComparison.mockResolvedValue(aiRecord());
    // First goal runs, then the key disappears: the second agent is null.
    mocks.createAiAgent.mockReturnValueOnce(agent).mockReturnValueOnce(null);

    await startComparisonRun(comparisonId);

    expect(mocks.runAiJourney).toHaveBeenCalledTimes(1);
    // The finished first journey stays on disk as honest partial evidence.
    expect(mocks.saveJourney).toHaveBeenCalledTimes(1);

    const failedRecord = mocks.saveComparison.mock.calls.at(-1)![0];
    expect(failedRecord.status).toBe("failed");
    expect(failedRecord.error).toBe("AI mode is not configured.");
    expect(failedRecord.completedAt).toBeDefined();

    expect(hasActiveRun()).toBe(false);
    expect(activeComparisonId()).toBeNull();
  });
});

describe("benchmarkOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes the configured value to a bare origin", () => {
    vi.stubEnv("BENCHMARK_ORIGIN", "http://localhost:3001");
    expect(benchmarkOrigin()).toBe("http://localhost:3001");

    vi.stubEnv("BENCHMARK_ORIGIN", "http://localhost:3001/");
    expect(benchmarkOrigin()).toBe("http://localhost:3001");

    vi.stubEnv("BENCHMARK_ORIGIN", "http://localhost:3001/nested/path");
    expect(benchmarkOrigin()).toBe("http://localhost:3001");
  });

  it("falls back to the safe default when unset", () => {
    vi.stubEnv("BENCHMARK_ORIGIN", "");
    expect(benchmarkOrigin()).toBe("http://localhost:3001");
  });
});
