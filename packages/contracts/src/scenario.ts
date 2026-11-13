import { z } from "zod";

export const scenarioIdSchema = z.enum([
  "membership-balanced",
  "membership-asymmetric",
  "consent-balanced",
  "consent-asymmetric",
]);

export const goalIdSchema = z.enum([
  "join",
  "leave",
  "accept",
  "reject",
]);

export const goalSchema = z.object({
  id: goalIdSchema,
  label: z.string().min(1),
  description: z.string().min(1),
});

export const expectedActionSchema = z.object({
  goalId: goalIdSchema,
  count: z.number().int().positive(),
});

export const scenarioSchema = z.object({
  id: scenarioIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  benchmarkPath: z.string().startsWith("/"),
  kind: z.enum(["membership", "consent"]),
  variant: z.enum(["balanced", "asymmetric"]),
  goals: z.array(goalSchema).length(2),
  expectedActions: z.array(expectedActionSchema).length(2),
});

export const scenarioListSchema = z.array(scenarioSchema);

export const comparisonRequestSchema = z.object({
  scenarioId: scenarioIdSchema,
  goalIds: z.tuple([goalIdSchema, goalIdSchema]),
});

export type Goal = z.infer<typeof goalSchema>;
export type ExpectedAction = z.infer<typeof expectedActionSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type ComparisonRequest = z.infer<typeof comparisonRequestSchema>;
