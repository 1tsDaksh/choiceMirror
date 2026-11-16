import type {
  ActionProposal,
  AgentDecision,
  AiJourneySummary,
  DeciderInput,
  NavigationAgent,
} from "@choicemirror/contracts";
import { actionProposalSchema } from "@choicemirror/contracts";
import { PROMPT_VERSION, type NebiusConfig } from "./config";
import { createNebiusClient, type ChatClient } from "./client";
import { NebiusAgentError } from "./errors";
import { buildMessages } from "./prompt";

const REASK_FEEDBACK =
  "Your last reply was not valid JSON matching the schema. Reply with only the JSON object.";

const MALFORMED_MESSAGE = "Model returned an invalid action proposal.";
const BUDGET_MESSAGE = "Journey token budget exhausted.";

function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1]!.trim() : trimmed;
}

function parseProposal(content: string): ActionProposal | null {
  let raw: unknown;
  try {
    raw = JSON.parse(stripFences(content));
  } catch {
    return null;
  }
  const parsed = actionProposalSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Turns one DeciderInput into one validated ActionProposal. All accumulation
 * (tokens, calls, errors) lives here so the runner only reads `summary()`.
 *
 * `summary().rejectedProposals` is always 0 — the runner owns the rejection
 * count and merges it when building journey evidence.
 */
export function createNebiusAgent(
  config: NebiusConfig,
  clientOverride?: ChatClient,
): NavigationAgent {
  const client = clientOverride ?? createNebiusClient(config);
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let inferenceCalls = 0;
  const modelErrors: AiJourneySummary["modelErrors"] = [];

  function recordError(
    kind: AiJourneySummary["modelErrors"][number]["kind"],
    message: string,
  ): void {
    if (modelErrors.length < 10) {
      modelErrors.push({ kind, message: message.slice(0, 500) });
    }
  }

  async function decide(input: DeciderInput): Promise<AgentDecision> {
    if (totalTokens >= config.maxTokensPerJourney) {
      return {
        kind: "error",
        errorKind: "budget",
        message: BUDGET_MESSAGE,
        apiCalls: 0,
      };
    }

    try {
      const first = await client.chat(buildMessages(input));
      inferenceCalls += first.apiCalls;
      inputTokens += first.usage.inputTokens;
      outputTokens += first.usage.outputTokens;
      totalTokens += first.usage.totalTokens;

      const proposal = parseProposal(first.content);
      if (proposal) {
        return {
          kind: "proposal",
          proposal,
          usage: first.usage,
          latencyMs: first.latencyMs,
          apiCalls: first.apiCalls,
        };
      }

      const second = await client.chat(
        buildMessages({ ...input, feedback: REASK_FEEDBACK }),
      );
      inferenceCalls += second.apiCalls;
      inputTokens += second.usage.inputTokens;
      outputTokens += second.usage.outputTokens;
      totalTokens += second.usage.totalTokens;

      const combinedUsage = {
        inputTokens: first.usage.inputTokens + second.usage.inputTokens,
        outputTokens: first.usage.outputTokens + second.usage.outputTokens,
        totalTokens: first.usage.totalTokens + second.usage.totalTokens,
      };
      const combinedCalls = first.apiCalls + second.apiCalls;
      const combinedLatency = first.latencyMs + second.latencyMs;

      const retried = parseProposal(second.content);
      if (retried) {
        return {
          kind: "proposal",
          proposal: retried,
          usage: combinedUsage,
          latencyMs: combinedLatency,
          apiCalls: combinedCalls,
        };
      }

      recordError("malformed", MALFORMED_MESSAGE);
      return {
        kind: "error",
        errorKind: "malformed",
        message: MALFORMED_MESSAGE,
        usage: combinedUsage,
        latencyMs: combinedLatency,
        apiCalls: combinedCalls,
      };
    } catch (error) {
      if (error instanceof NebiusAgentError) {
        inferenceCalls += error.apiCalls;
        if (error.usage) {
          inputTokens += error.usage.inputTokens;
          outputTokens += error.usage.outputTokens;
          totalTokens += error.usage.totalTokens;
        }
        recordError(error.kind, error.message);
        return {
          kind: "error",
          errorKind: error.kind,
          message: error.message,
          ...(error.usage ? { usage: error.usage } : {}),
          apiCalls: error.apiCalls,
        };
      }
      throw error;
    }
  }

  function summary(): AiJourneySummary {
    return {
      provider: "nebius",
      model: config.model,
      promptVersion: PROMPT_VERSION,
      inferenceCalls,
      inputTokens,
      outputTokens,
      rejectedProposals: 0,
      modelErrors: [...modelErrors].slice(0, 10),
    };
  }

  return { decide, summary };
}
