import { describe, expect, it, vi } from "vitest";
import type { PageObservation } from "@choicemirror/contracts";
import { nebiusConfig, PROMPT_VERSION, type NebiusConfig } from "./config.js";
import { NebiusAgentError } from "./errors.js";
import type { ChatClient, ChatResult } from "./client.js";
import { createNebiusAgent } from "./agent.js";

const OBSERVATION: PageObservation = {
  ref: "obs-1",
  url: "https://demo.test/start",
  title: "Start",
  headings: ["Start"],
  text: "Welcome.",
  elements: [
    { id: "element-0001", role: "button", name: "Finish the flow", enabled: true },
  ],
};

const INPUT = {
  goalDescription: "Leave the synthetic workspace.",
  observation: OBSERVATION,
};

function chatResult(
  content: string,
  overrides: Partial<ChatResult> = {},
): ChatResult {
  return {
    content,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    latencyMs: 10,
    apiCalls: 1,
    ...overrides,
  };
}

function config(extra: Partial<NebiusConfig> = {}): NebiusConfig {
  return nebiusConfig({ apiKey: "test-key", retryBackoffMs: 0, ...extra });
}

function clientWith(
  implementation: ChatClient["chat"],
): { client: ChatClient; chat: ReturnType<typeof vi.fn> } {
  const chat = vi.fn(implementation);
  return { client: { chat }, chat };
}

describe("createNebiusAgent", () => {
  it("returns a validated proposal with usage, latency, and api calls", async () => {
    const { client, chat } = clientWith(async () =>
      chatResult('{"action":"click","targetId":"element-0001","reason":"next step"}', {
        usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
        latencyMs: 42,
        apiCalls: 1,
      }),
    );
    const agent = createNebiusAgent(config(), client);

    const decision = await agent.decide(INPUT);

    expect(decision.kind).toBe("proposal");
    if (decision.kind !== "proposal") throw new Error("unreachable");
    expect(decision.proposal).toEqual({
      action: "click",
      targetId: "element-0001",
      reason: "next step",
    });
    expect(decision.usage).toEqual({
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
    });
    expect(decision.latencyMs).toBe(42);
    expect(decision.apiCalls).toBe(1);

    const summary = agent.summary();
    expect(summary.provider).toBe("nebius");
    expect(summary.model).toBe(config().model);
    expect(summary.promptVersion).toBe(PROMPT_VERSION);
    expect(summary.inferenceCalls).toBe(1);
    expect(summary.inputTokens).toBe(100);
    expect(summary.outputTokens).toBe(20);
    expect(summary.modelErrors).toEqual([]);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it("re-asks once on non-JSON output then reports malformed", async () => {
    const { client, chat } = clientWith(async () =>
      chatResult("I think you should stop."),
    );
    const agent = createNebiusAgent(config(), client);

    const decision = await agent.decide(INPUT);

    expect(decision.kind).toBe("error");
    if (decision.kind !== "error") throw new Error("unreachable");
    expect(decision.errorKind).toBe("malformed");
    expect(decision.message).toBe(
      "Model returned an invalid action proposal.",
    );
    expect(decision.apiCalls).toBe(2);
    expect(chat).toHaveBeenCalledTimes(2);
    expect(agent.summary().modelErrors[0]?.kind).toBe("malformed");
    expect(agent.summary().inferenceCalls).toBe(2);
  });

  it("surfaces client errors as error decisions and records them", async () => {
    const { client } = clientWith(async () => {
      throw new NebiusAgentError(
        "auth",
        "Nebius rejected the API key (HTTP 401).",
        1,
      );
    });
    const agent = createNebiusAgent(config(), client);

    const decision = await agent.decide(INPUT);

    expect(decision.kind).toBe("error");
    if (decision.kind !== "error") throw new Error("unreachable");
    expect(decision.errorKind).toBe("auth");
    expect(decision.message).toBe("Nebius rejected the API key (HTTP 401).");
    expect(decision.apiCalls).toBe(1);

    const summary = agent.summary();
    expect(summary.modelErrors).toHaveLength(1);
    expect(summary.modelErrors[0]?.kind).toBe("auth");
    expect(summary.inferenceCalls).toBe(1);
  });

  it("stops calling the client once the journey token budget is spent", async () => {
    const { client, chat } = clientWith(async () =>
      chatResult('{"action":"stop","reason":"done"}', {
        usage: { inputTokens: 60, outputTokens: 40, totalTokens: 100 },
      }),
    );
    const agent = createNebiusAgent(
      config({ maxTokensPerJourney: 100 }),
      client,
    );

    const first = await agent.decide(INPUT);
    expect(first.kind).toBe("proposal");

    const second = await agent.decide(INPUT);
    expect(second.kind).toBe("error");
    if (second.kind !== "error") throw new Error("unreachable");
    expect(second.errorKind).toBe("budget");
    expect(second.message).toBe("Journey token budget exhausted.");
    expect(second.apiCalls).toBe(0);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it("accumulates usage and errors across decides in the summary", async () => {
    const { client } = clientWith(async () =>
      chatResult('{"action":"stop","reason":"done"}', {
        usage: { inputTokens: 30, outputTokens: 10, totalTokens: 40 },
      }),
    );
    const agent = createNebiusAgent(config(), client);

    await agent.decide(INPUT);
    await agent.decide(INPUT);

    const summary = agent.summary();
    expect(summary.provider).toBe("nebius");
    expect(summary.promptVersion).toBe(PROMPT_VERSION);
    expect(summary.model).toBe(config().model);
    expect(summary.inferenceCalls).toBe(2);
    expect(summary.inputTokens).toBe(60);
    expect(summary.outputTokens).toBe(20);
    expect(summary.rejectedProposals).toBe(0);
  });
});
