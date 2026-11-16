import {
  NEBIUS_DEFAULT_MODEL,
  createNebiusAgent,
  nebiusConfigFromEnv,
} from "@choicemirror/agent";
import type { NavigationAgent } from "@choicemirror/contracts";

/**
 * Server-side only: the API key is read from the process environment and
 * never leaves the server. Nothing here is importable from client code paths
 * (no "use client" consumers) and the key is never part of any return value.
 */
export function isAiConfigured(): boolean {
  return nebiusConfigFromEnv(process.env) !== null;
}

/**
 * One fresh agent per journey so per-journey token budgets, counters, and
 * error history never leak across comparisons. Returns null when the
 * provider is unconfigured — callers must fail explicitly, never fall back
 * to deterministic execution.
 */
export function createAiAgent(): NavigationAgent | null {
  const config = nebiusConfigFromEnv(process.env);
  return config ? createNebiusAgent(config) : null;
}

/** Model id for evidence — defaulted, never the key. */
export function aiModelId(): string {
  return nebiusConfigFromEnv(process.env)?.model ?? NEBIUS_DEFAULT_MODEL;
}
