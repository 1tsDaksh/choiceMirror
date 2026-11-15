import { describe, expect, test } from "vitest";

import {
  OBSERVATION_LIMITS,
  actionProposalSchema,
  aiEventSchema,
  aiJourneySummarySchema,
  pageObservationSchema,
} from "./agent";
import {
  comparisonRecordSchema,
  journeyRecordSchema,
  traceEventSchema,
} from "./evidence";
import { comparisonRequestSchema } from "./scenario";

const validElement = {
  id: "element-0",
  role: "button",
  name: "Leave the synthetic workspace.",
  enabled: true,
};

const validObservation = {
  ref: "obs-0",
  url: "http://localhost:3001/membership-asymmetric?seed=phase-2",
  title: "Membership — asymmetric",
  headings: ["Membership — asymmetric"],
  text: "Starting state",
  elements: [validElement],
};

const validUsage = { inputTokens: 100, outputTokens: 20, totalTokens: 120 };

const validAiEvent = {
  observationRef: "obs-0",
  proposed: {
    action: "click",
    targetId: "element-0",
    reason: "This control continues the leaving process.",
  },
  executedLabel: "Leave the synthetic workspace.",
  validation: "executed",
  model: "zai-org/GLM-5.3-Flash",
  promptVersion: "phase3-v1",
  usage: validUsage,
  latencyMs: 840,
};

const validAiSummary = {
  provider: "nebius",
  model: "zai-org/GLM-5.3-Flash",
  promptVersion: "phase3-v1",
  inferenceCalls: 4,
  inputTokens: 4800,
  outputTokens: 240,
  rejectedProposals: 0,
  modelErrors: [],
};

const validTraceEvent = {
  stepNo: 0,
  timestamp: "2026-11-15T12:00:00.000Z",
  type: "navigate",
  label: "Open fixture",
  outcome: "success",
  countsAsAction: false,
};

const phase2Journey = {
  id: "cmp_0123456789abcdef-leave",
  comparisonId: "cmp_0123456789abcdef",
  goalId: "leave",
  status: "completed",
  seed: "phase-2",
  origin: "http://localhost:3001",
  viewport: { width: 1280, height: 720 },
  expectedActionCount: 3,
  actionCount: 3,
  startedAt: "2026-11-15T12:00:00.000Z",
  completedAt: "2026-11-15T12:00:05.000Z",
  events: [validTraceEvent],
  screenshots: [
    { id: "cmp_0123456789abcdef-leave-start.png", label: "Starting state" },
  ],
};

describe("actionProposalSchema", () => {
  test("click proposal with an observation element id parses", () => {
    expect(
      actionProposalSchema.parse({
        action: "click",
        targetId: "element-3",
        reason: "This control appears to continue the leaving process.",
      }),
    ).toEqual({
      action: "click",
      targetId: "element-3",
      reason: "This control appears to continue the leaving process.",
    });
  });

  test("stop proposal parses", () => {
    expect(
      actionProposalSchema.parse({
        action: "stop",
        reason: "The goal appears complete.",
      }),
    ).toEqual({ action: "stop", reason: "The goal appears complete." });
  });

  test("rejects actions outside click and stop", () => {
    expect(
      actionProposalSchema.safeParse({
        action: "navigate",
        url: "https://evil.example",
      }).success,
    ).toBe(false);
    expect(
      actionProposalSchema.safeParse({
        action: "click",
        url: "https://evil.example",
      }).success,
    ).toBe(false);
  });

  test("rejects missing or empty reason", () => {
    expect(
      actionProposalSchema.safeParse({
        action: "stop",
      }).success,
    ).toBe(false);
    expect(
      actionProposalSchema.safeParse({
        action: "stop",
        reason: "",
      }).success,
    ).toBe(false);
  });

  test("rejects target ids that are not observation element ids", () => {
    for (const targetId of ["3", "element-x", "element-999x", "../element-1"]) {
      expect(
        actionProposalSchema.safeParse({
          action: "click",
          targetId,
          reason: "Because.",
        }).success,
      ).toBe(false);
    }
  });
});

describe("pageObservationSchema", () => {
  test("accepts a well-formed observation", () => {
    expect(pageObservationSchema.parse(validObservation)).toEqual(
      validObservation,
    );
  });

  test("rejects more elements than the observation limit", () => {
    const elements = Array.from({ length: OBSERVATION_LIMITS.MAX_ELEMENTS + 1 }, (_, index) => ({
      ...validElement,
      id: `element-${index}`,
    }));
    expect(
      pageObservationSchema.safeParse({ ...validObservation, elements })
        .success,
    ).toBe(false);
  });

  test("rejects text beyond the character bound", () => {
    expect(
      pageObservationSchema.safeParse({
        ...validObservation,
        text: "x".repeat(OBSERVATION_LIMITS.MAX_TEXT_CHARS + 1),
      }).success,
    ).toBe(false);
  });

  test("rejects elements with an empty accessible name", () => {
    expect(
      pageObservationSchema.safeParse({
        ...validObservation,
        elements: [{ ...validElement, name: "" }],
      }).success,
    ).toBe(false);
  });
});

describe("ai evidence schemas", () => {
  test("trace event with an ai block parses", () => {
    expect(
      traceEventSchema.parse({ ...validTraceEvent, ai: validAiEvent }),
    ).toEqual({ ...validTraceEvent, ai: validAiEvent });
  });

  test("trace event without an ai block still parses (phase 2 back-compat)", () => {
    expect(traceEventSchema.parse(validTraceEvent)).toEqual(validTraceEvent);
  });

  test("ai event rejects an unknown validation state", () => {
    expect(
      aiEventSchema.safeParse({ ...validAiEvent, validation: "maybe" })
        .success,
    ).toBe(false);
  });

  test("ai journey summary rejects negative inference calls", () => {
    expect(
      aiJourneySummarySchema.safeParse({
        ...validAiSummary,
        inferenceCalls: -1,
      }).success,
    ).toBe(false);
  });
});

describe("record schemas with execution mode", () => {
  test("phase 2 era journey without mode or ai parses", () => {
    expect(journeyRecordSchema.parse(phase2Journey)).toEqual(phase2Journey);
  });

  test("ai journey with mode and ai summary parses", () => {
    const parsed = journeyRecordSchema.parse({
      ...phase2Journey,
      mode: "ai",
      ai: validAiSummary,
    });
    expect(parsed.mode).toBe("ai");
    expect(parsed.ai).toEqual(validAiSummary);
  });

  test("journey rejects an unknown execution mode", () => {
    expect(
      journeyRecordSchema.safeParse({ ...phase2Journey, mode: "manual" })
        .success,
    ).toBe(false);
  });

  test("comparison record without mode parses (phase 2 back-compat)", () => {
    const record = {
      id: "cmp_0123456789abcdef",
      scenarioId: "membership-asymmetric",
      goalIds: ["leave", "join"] as [string, string],
      seed: "phase-2",
      status: "completed",
      createdAt: "2026-11-15T12:00:00.000Z",
      completedAt: "2026-11-15T12:00:10.000Z",
    };
    expect(comparisonRecordSchema.parse(record)).toEqual(record);
    expect(
      comparisonRecordSchema.safeParse({ ...record, mode: "ai" }).success,
    ).toBe(true);
    expect(
      comparisonRecordSchema.safeParse({ ...record, mode: "manual" }).success,
    ).toBe(false);
  });
});

describe("comparisonRequestSchema execution mode", () => {
  const base = {
    scenarioId: "membership-asymmetric",
    goalIds: ["leave", "join"],
  };

  test("parses without a mode (defaults applied by the caller)", () => {
    expect(comparisonRequestSchema.parse(base)).toEqual(base);
  });

  test("parses with mode ai", () => {
    expect(comparisonRequestSchema.parse({ ...base, mode: "ai" })).toEqual({
      ...base,
      mode: "ai",
    });
  });

  test("rejects an unknown mode", () => {
    expect(
      comparisonRequestSchema.safeParse({ ...base, mode: "chatgpt" }).success,
    ).toBe(false);
  });
});
