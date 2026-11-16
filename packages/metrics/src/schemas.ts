import { comparisonStatusSchema, goalIdSchema } from "@choicemirror/contracts";
import { z } from "zod";

export const journeyOutcomeSchema = z.enum([
  "completed",
  "failed",
  "blocked",
  "timed-out",
  "pending",
]);

export const journeyAiMetricsSchema = z.object({
  inferenceCalls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  rejectedProposals: z.number().int().nonnegative(),
});

export const journeyEvidenceSchema = z.object({
  traceRecorded: z.boolean(),
  screenshotCount: z.number().int().nonnegative(),
  missingScreenshotIds: z.array(z.string()),
  danglingScreenshotIds: z.array(z.string()),
  complete: z.boolean(),
});

export const journeyMetricsSchema = z.object({
  journeyId: z.string().nullable(),
  goalId: goalIdSchema,
  outcome: journeyOutcomeSchema,
  actionCount: z.number().int().nonnegative().nullable(),
  navigationEventCount: z.number().int().nonnegative().nullable(),
  durationMs: z.number().nullable(),
  ai: journeyAiMetricsSchema.nullable(),
  evidence: journeyEvidenceSchema,
});

export type JourneyOutcome = z.infer<typeof journeyOutcomeSchema>;
export type JourneyAiMetrics = z.infer<typeof journeyAiMetricsSchema>;
export type JourneyEvidence = z.infer<typeof journeyEvidenceSchema>;
export type JourneyMetrics = z.infer<typeof journeyMetricsSchema>;

export const comparisonResultSchema = z.enum([
  "balanced",
  "observed-asymmetry",
  "inconclusive",
]);

export const comparableConditionsSchema = z.object({
  comparable: z.boolean(),
  reasons: z.array(z.string()),
});

export const comparisonMetricsSchema = z.object({
  comparisonId: z.string(),
  status: comparisonStatusSchema,
  journeys: z.tuple([journeyMetricsSchema, journeyMetricsSchema]),
  actionDifference: z.number().int().nonnegative().nullable(),
  heavierJourney: z.enum(["a", "b"]).nullable(),
  actionRatio: z.number().nullable(),
  comparableConditions: comparableConditionsSchema,
  result: comparisonResultSchema,
});

export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
export type ComparableConditions = z.infer<typeof comparableConditionsSchema>;
export type ComparisonMetrics = z.infer<typeof comparisonMetricsSchema>;
