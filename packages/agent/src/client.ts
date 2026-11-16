import type { TokenUsage } from "@choicemirror/contracts";
import type { NebiusConfig } from "./config.js";
import { NebiusAgentError } from "./errors.js";
import type { ChatMessage } from "./prompt.js";

export type ChatResult = {
  content: string;
  usage: TokenUsage;
  latencyMs: number;
  apiCalls: number;
};

export type ChatClient = {
  chat(messages: ChatMessage[]): Promise<ChatResult>;
};

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

/**
 * Runs one fetch with a hard timeout. The abort races the underlying request
 * so even a fetch implementation that ignores the signal cannot hang us.
 */
function fetchWithTimeout(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => {
        const error = new Error("The operation was aborted.");
        error.name = "AbortError";
        reject(error);
      },
      { once: true },
    );
  });
  return Promise.race([
    fetchFn(url, { ...init, signal: controller.signal }),
    aborted,
  ]).finally(() => clearTimeout(timer)) as Promise<Response>;
}

function mapUsage(raw: unknown): TokenUsage {
  if (typeof raw !== "object" || raw === null) return { ...ZERO_USAGE };
  const record = raw as Record<string, unknown>;
  const input = typeof record.prompt_tokens === "number" ? record.prompt_tokens : 0;
  const output =
    typeof record.completion_tokens === "number" ? record.completion_tokens : 0;
  const total = typeof record.total_tokens === "number" ? record.total_tokens : 0;
  return {
    inputTokens: Math.max(0, Math.trunc(input)),
    outputTokens: Math.max(0, Math.trunc(output)),
    totalTokens: Math.max(0, Math.trunc(total)),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function statusError(status: number, attempts: number): NebiusAgentError {
  if (status === 401 || status === 403) {
    return new NebiusAgentError(
      "auth",
      `Nebius rejected the API key (HTTP ${status}).`,
      attempts,
    );
  }
  if (status === 402) {
    return new NebiusAgentError(
      "credits",
      "Nebius reported no remaining credits (HTTP 402).",
      attempts,
    );
  }
  if (status === 404) {
    return new NebiusAgentError(
      "model-unavailable",
      "Nebius returned HTTP 404: model or endpoint not found.",
      attempts,
    );
  }
  if (status === 429) {
    return new NebiusAgentError(
      "rate-limit",
      `Nebius rate limit persisted after ${attempts} attempts.`,
      attempts,
    );
  }
  if (status >= 500) {
    return new NebiusAgentError(
      "api",
      `Nebius server error after ${attempts} attempts.`,
      attempts,
    );
  }
  return new NebiusAgentError(
    "api",
    `Nebius request rejected (HTTP ${status}).`,
    attempts,
  );
}

function transientError(
  kind: "network" | "timeout",
  attempts: number,
): NebiusAgentError {
  const message =
    kind === "timeout"
      ? `Nebius request timed out after ${attempts} attempts.`
      : `Network error talking to Nebius after ${attempts} attempts.`;
  return new NebiusAgentError(kind, message, attempts);
}

/**
 * Typed OpenAI-compatible chat adapter over fetch. Bounded retries only for
 * transient failures (429/5xx/network/timeout); auth, credits, model, and
 * malformed responses fail fast. Malformed bodies get exactly one re-fetch —
 * mirroring the agent's single corrective re-ask — and never more.
 */
export function createNebiusClient(
  config: NebiusConfig,
  fetchFn: typeof fetch = fetch,
): ChatClient {
  return {
    async chat(messages: ChatMessage[]): Promise<ChatResult> {
      const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const init: RequestInit = {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxOutputTokens,
        }),
      };

      const maxAttempts = Math.max(1, config.maxRetries + 1);
      const malformedAttempts = Math.min(maxAttempts, 2);
      const startedAt = Date.now();
      let attempts = 0;

      while (true) {
        attempts += 1;
        let response: Response;
        try {
          response = await fetchWithTimeout(
            fetchFn,
            url,
            init,
            config.timeoutMs,
          );
        } catch (error) {
          if (attempts >= maxAttempts) {
            throw isAbortError(error)
              ? transientError("timeout", attempts)
              : transientError("network", attempts);
          }
          await sleep(config.retryBackoffMs);
          continue;
        }

        if (!response.ok) {
          if (isRetryableStatus(response.status) && attempts < maxAttempts) {
            await sleep(config.retryBackoffMs);
            continue;
          }
          throw statusError(response.status, attempts);
        }

        let payload: unknown;
        try {
          payload = JSON.parse(await response.text());
        } catch {
          payload = undefined;
        }
        const content =
          typeof payload === "object" && payload !== null
            ? (payload as { choices?: Array<{ message?: { content?: unknown } }> })
                .choices?.[0]?.message?.content
            : undefined;

        if (typeof content !== "string" || content.length === 0) {
          if (attempts >= malformedAttempts) {
            throw new NebiusAgentError(
              "malformed",
              "Nebius returned an invalid response body.",
              attempts,
            );
          }
          await sleep(config.retryBackoffMs);
          continue;
        }

        const record =
          typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>)
            : {};
        return {
          content,
          usage: mapUsage(record.usage),
          latencyMs: Date.now() - startedAt,
          apiCalls: attempts,
        };
      }
    },
  };
}
