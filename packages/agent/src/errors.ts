import type { AgentErrorKind, TokenUsage } from "@choicemirror/contracts";

export type NebiusErrorKind = AgentErrorKind;

/**
 * Every message is constructed by us from a pinned template — upstream
 * response bodies are never passed through, so provider error pages (which
 * may echo the key or attacker-controlled text) cannot reach logs or evidence.
 */
export class NebiusAgentError extends Error {
  readonly kind: NebiusErrorKind;
  /** HTTP attempts made so far, so callers can report honest call counts. */
  readonly apiCalls: number;
  readonly usage?: TokenUsage | undefined;

  constructor(kind: NebiusErrorKind, message: string, apiCalls = 1, usage?: TokenUsage) {
    super(message);
    this.name = "NebiusAgentError";
    this.kind = kind;
    this.apiCalls = apiCalls;
    this.usage = usage;
  }
}
