import { describe, expect, it, vi } from "vitest";
import type { NebiusConfig } from "./config";
import { nebiusConfig } from "./config";
import { NebiusAgentError } from "./errors";
import { createNebiusClient } from "./client";

const KEY = "secret-key-value";

function config(extra: Partial<NebiusConfig> = {}): NebiusConfig {
  return nebiusConfig({ apiKey: KEY, retryBackoffMs: 0, ...extra });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const VALID_CONTENT = '{"action":"stop","reason":"done"}';
const VALID_PAYLOAD = {
  choices: [{ message: { content: VALID_CONTENT } }],
  usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
};

function asFetch(mock: ReturnType<typeof vi.fn>): typeof fetch {
  return mock as unknown as typeof fetch;
}

const MESSAGES = [
  { role: "system" as const, content: "system prompt" },
  { role: "user" as const, content: "user message" },
];

describe("createNebiusClient", () => {
  it("sends a bounded chat request and maps usage on success", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(VALID_PAYLOAD));
    const cfg = config();
    const client = createNebiusClient(cfg, asFetch(fetchFn));

    const result = await client.chat(MESSAGES);

    expect(result.content).toBe(VALID_CONTENT);
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20, totalTokens: 120 });
    expect(result.apiCalls).toBe(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(String(url)).toBe(`${cfg.baseUrl}/chat/completions`);
    const body = JSON.parse(init.body);
    expect(body.model).toBe(cfg.model);
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(300);
    expect("response_format" in body).toBe(false);
    expect(body.messages[0].role).toBe("system");
    expect(init.headers.authorization).toBe(`Bearer ${KEY}`);
  });

  it("retries a malformed body once and succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("not json", { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(VALID_PAYLOAD));
    const client = createNebiusClient(config(), asFetch(fetchFn));

    const result = await client.chat(MESSAGES);

    expect(result.content).toBe(VALID_CONTENT);
    expect(result.apiCalls).toBe(2);
  });

  it("throws malformed after two invalid bodies", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("not json", { status: 200 }));
    const client = createNebiusClient(config(), asFetch(fetchFn));

    const error = await client.chat(MESSAGES).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NebiusAgentError);
    expect((error as NebiusAgentError).kind).toBe("malformed");
    expect((error as NebiusAgentError).apiCalls).toBe(2);
    expect((error as Error).message).toBe(
      "Nebius returned an invalid response body.",
    );
  });

  it("maps 401 to auth without retrying and never leaks the key", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    const client = createNebiusClient(config(), asFetch(fetchFn));

    const error = (await client
      .chat(MESSAGES)
      .catch((e: unknown) => e)) as NebiusAgentError;

    expect(error).toBeInstanceOf(NebiusAgentError);
    expect(error.kind).toBe("auth");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(error.message).toContain("API key");
    expect(error.message).toContain("401");
    expect(error.message).not.toContain(KEY);
    expect(JSON.stringify(error)).not.toContain(KEY);
  });

  it("maps 402 to credits and 404 to model-unavailable without retrying", async () => {
    const creditsFetch = vi.fn().mockResolvedValue(jsonResponse({}, 402));
    const credits = (await createNebiusClient(config(), asFetch(creditsFetch))
      .chat(MESSAGES)
      .catch((e: unknown) => e)) as NebiusAgentError;
    expect(credits.kind).toBe("credits");
    expect(creditsFetch).toHaveBeenCalledTimes(1);

    const modelFetch = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    const missing = (await createNebiusClient(config(), asFetch(modelFetch))
      .chat(MESSAGES)
      .catch((e: unknown) => e)) as NebiusAgentError;
    expect(missing.kind).toBe("model-unavailable");
    expect(modelFetch).toHaveBeenCalledTimes(1);
    expect(missing.message).toContain("404");
  });

  it("retries 429 three times total then throws rate-limit", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    const client = createNebiusClient(config(), asFetch(fetchFn));

    const error = (await client
      .chat(MESSAGES)
      .catch((e: unknown) => e)) as NebiusAgentError;

    expect(error.kind).toBe("rate-limit");
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(error.apiCalls).toBe(3);
    expect(error.message).toContain("after 3 attempts");
  });

  it("retries a 500 once and then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(VALID_PAYLOAD));
    const client = createNebiusClient(config(), asFetch(fetchFn));

    const result = await client.chat(MESSAGES);

    expect(result.content).toBe(VALID_CONTENT);
    expect(result.apiCalls).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries network failures three times then throws network", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const client = createNebiusClient(config(), asFetch(fetchFn));

    const error = (await client
      .chat(MESSAGES)
      .catch((e: unknown) => e)) as NebiusAgentError;

    expect(error.kind).toBe("network");
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(error.apiCalls).toBe(3);
  });

  it("aborts a hanging request as timeout within the attempt bound", async () => {
    const fetchFn = vi.fn(() => new Promise<Response>(() => {}));
    const client = createNebiusClient(
      config({ timeoutMs: 20 }),
      asFetch(fetchFn),
    );

    const error = (await client
      .chat(MESSAGES)
      .catch((e: unknown) => e)) as NebiusAgentError;

    expect(error).toBeInstanceOf(NebiusAgentError);
    expect(error.kind).toBe("timeout");
    expect(fetchFn.mock.calls.length).toBeLessThanOrEqual(3);
    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(1);
  }, 10_000);
});
