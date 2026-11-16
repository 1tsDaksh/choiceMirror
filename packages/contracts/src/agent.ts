import { z } from "zod";

/** Bounds applied to everything sent to the model — cost and safety caps. */
export const OBSERVATION_LIMITS = {
  MAX_ELEMENTS: 40,
  MAX_HEADINGS: 20,
  MAX_TEXT_CHARS: 3_000,
  MAX_NAME_CHARS: 200,
  MAX_REASON_CHARS: 500,
  MAX_TITLE_CHARS: 200,
} as const;

export const targetIdSchema = z
  .string()
  .regex(/^element-\d+$/, "must be an observation element id");

/**
 * The only actions the model may ever propose. Anything else (navigation,
 * typing, JavaScript, arbitrary selectors) fails validation here and is
 * rejected before it can reach the browser.
 */
export const actionProposalSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("click"),
    targetId: targetIdSchema,
    reason: z.string().min(1).max(OBSERVATION_LIMITS.MAX_REASON_CHARS),
  }),
  z.object({
    action: z.literal("stop"),
    reason: z.string().min(1).max(OBSERVATION_LIMITS.MAX_REASON_CHARS),
  }),
]);

export const observationElementSchema = z.object({
  id: targetIdSchema,
  role: z.string().min(1).max(40),
  name: z.string().min(1).max(OBSERVATION_LIMITS.MAX_NAME_CHARS),
  enabled: z.boolean(),
});

/** Bounded, redaction-ready view of one page state. Never contains raw HTML. */
export const pageObservationSchema = z.object({
  ref: z.string().min(1).max(64),
  url: z.string().url(),
  title: z.string().max(OBSERVATION_LIMITS.MAX_TITLE_CHARS),
  headings: z
    .array(z.string().max(OBSERVATION_LIMITS.MAX_NAME_CHARS))
    .max(OBSERVATION_LIMITS.MAX_HEADINGS),
  text: z.string().max(OBSERVATION_LIMITS.MAX_TEXT_CHARS),
  elements: z
    .array(observationElementSchema)
    .max(OBSERVATION_LIMITS.MAX_ELEMENTS),
});

export const tokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export const agentErrorKindSchema = z.enum([
  "auth",
  "credits",
  "model-unavailable",
  "rate-limit",
  "timeout",
  "network",
  "malformed",
  "budget",
  "api",
]);

/** Per-decision provenance attached to a trace event when a proposal exists. */
export const aiEventSchema = z.object({
  observationRef: z.string().min(1).max(64),
  proposed: actionProposalSchema,
  executedLabel: z
    .string()
    .min(1)
    .max(OBSERVATION_LIMITS.MAX_NAME_CHARS)
    .optional(),
  validation: z.enum(["executed", "rejected", "model-error"]),
  detail: z.string().max(OBSERVATION_LIMITS.MAX_REASON_CHARS).optional(),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  usage: tokenUsageSchema.optional(),
  latencyMs: z.number().int().nonnegative().optional(),
});

/** Journey-level model provenance. Model statements are recorded as reported. */
export const aiJourneySummarySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  inferenceCalls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  rejectedProposals: z.number().int().nonnegative(),
  modelErrors: z
    .array(
      z.object({
        kind: agentErrorKindSchema,
        message: z.string().min(1).max(500),
      }),
    )
    .max(10),
});

export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type ActionProposal = z.infer<typeof actionProposalSchema>;
export type ObservationElement = z.infer<typeof observationElementSchema>;
export type PageObservation = z.infer<typeof pageObservationSchema>;
export type AgentErrorKind = z.infer<typeof agentErrorKindSchema>;
export type AiEvent = z.infer<typeof aiEventSchema>;
export type AiJourneySummary = z.infer<typeof aiJourneySummarySchema>;

/**
 * One decision returned by a model decider. `apiCalls` counts the actual
 * HTTP requests made (including bounded retries and one corrective re-ask)
 * so evidence can report honest inference-call totals.
 */
export type AgentDecision =
  | {
      kind: "proposal";
      proposal: ActionProposal;
      usage?: TokenUsage;
      latencyMs?: number;
      apiCalls: number;
    }
  | {
      kind: "error";
      errorKind: AgentErrorKind;
      message: string;
      usage?: TokenUsage;
      latencyMs?: number;
      apiCalls: number;
    };

export type DeciderInput = {
  goalDescription: string;
  observation: PageObservation;
  feedback?: string;
};

export type AgentDecider = {
  decide(input: DeciderInput): Promise<AgentDecision>;
};

export type NavigationAgent = AgentDecider & {
  summary(): AiJourneySummary;
};

export type ProposalValidation =
  | { ok: true; decision: "stop" }
  | { ok: true; decision: "click"; element: ObservationElement }
  | { ok: false; reason: string };
