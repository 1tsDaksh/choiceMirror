import { randomBytes } from "node:crypto";

import { z } from "zod";

import { goalIdSchema, scenarioIdSchema } from "./scenario";

export const comparisonIdSchema = z
  .string()
  .regex(/^cmp_[a-f0-9]{16}$/, "must be a comparison id");

export const journeyIdSchema = z
  .string()
  .regex(
    /^cmp_[a-f0-9]{16}-(join|leave|accept|reject)$/,
    "must be a journey id",
  );

export const artifactIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+\.png$/, "must be a screenshot artifact id");

export const traceEventSchema = z.object({
  stepNo: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  type: z.enum(["navigate", "goal-selected", "click", "complete", "error"]),
  label: z.string().min(1),
  outcome: z.enum(["success", "failure"]),
  countsAsAction: z.boolean(),
  detail: z.string().optional(),
  screenshotId: z.string().optional(),
});

export const journeyStatusSchema = z.enum([
  "completed",
  "failed",
  "timeout",
  "blocked",
]);

export const journeyRecordSchema = z.object({
  id: z.string(),
  comparisonId: z.string(),
  goalId: goalIdSchema,
  status: journeyStatusSchema,
  seed: z.string().min(1),
  origin: z.string().url(),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  expectedActionCount: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  events: z.array(traceEventSchema),
  screenshots: z.array(
    z.object({ id: z.string(), label: z.string().min(1) }),
  ),
  error: z.string().optional(),
});

export const comparisonStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
]);

export const comparisonRecordSchema = z.object({
  id: comparisonIdSchema,
  scenarioId: scenarioIdSchema,
  goalIds: z.tuple([goalIdSchema, goalIdSchema]),
  seed: z.string().min(1),
  status: comparisonStatusSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export const comparisonDetailSchema = z.object({
  comparison: comparisonRecordSchema,
  journeys: z.array(journeyRecordSchema).max(2),
});

export type TraceEvent = z.infer<typeof traceEventSchema>;
export type JourneyStatus = z.infer<typeof journeyStatusSchema>;
export type JourneyRecord = z.infer<typeof journeyRecordSchema>;
export type ComparisonStatus = z.infer<typeof comparisonStatusSchema>;
export type ComparisonRecord = z.infer<typeof comparisonRecordSchema>;
export type ComparisonDetail = z.infer<typeof comparisonDetailSchema>;

export function newComparisonId(): string {
  return `cmp_${randomBytes(8).toString("hex")}`;
}

export function newJourneyId(
  comparisonId: string,
  goalId: z.infer<typeof goalIdSchema>,
): string {
  return `${comparisonId}-${goalId}`;
}

export function newArtifactId(journeyId: string, checkpoint: string): string {
  return `${journeyId}-${checkpoint}.png`;
}

export function parseComparisonId(raw: string): string | null {
  const parsed = comparisonIdSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
