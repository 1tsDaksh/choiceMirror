import { describe, expect, it } from "vitest";
import {
  NEBIUS_DEFAULT_BASE_URL,
  NEBIUS_DEFAULT_MODEL,
  NEBIUS_MAX_OUTPUT_TOKENS,
  NEBIUS_MAX_RETRIES,
  NEBIUS_MAX_TOKENS_PER_JOURNEY,
  NEBIUS_RETRY_BACKOFF_MS,
  NEBIUS_TEMPERATURE,
  NEBIUS_TIMEOUT_MS,
  nebiusConfig,
  nebiusConfigFromEnv,
} from "./config";

describe("nebiusConfigFromEnv", () => {
  it("returns null when the key is missing or blank", () => {
    expect(nebiusConfigFromEnv({})).toBeNull();
    expect(nebiusConfigFromEnv({ NEBIUS_API_KEY: "   " })).toBeNull();
  });

  it("applies defaults for a present key", () => {
    expect(nebiusConfigFromEnv({ NEBIUS_API_KEY: "k" })).toEqual({
      apiKey: "k",
      baseUrl: NEBIUS_DEFAULT_BASE_URL,
      model: NEBIUS_DEFAULT_MODEL,
      timeoutMs: NEBIUS_TIMEOUT_MS,
      maxRetries: NEBIUS_MAX_RETRIES,
      retryBackoffMs: NEBIUS_RETRY_BACKOFF_MS,
      maxTokensPerJourney: NEBIUS_MAX_TOKENS_PER_JOURNEY,
      maxOutputTokens: NEBIUS_MAX_OUTPUT_TOKENS,
      temperature: NEBIUS_TEMPERATURE,
    });
    expect(NEBIUS_DEFAULT_BASE_URL).toBe("https://api.tokenfactory.nebius.com/v1");
    expect(NEBIUS_DEFAULT_MODEL).toBe("zai-org/GLM-5.3-Flash");
    expect(NEBIUS_TIMEOUT_MS).toBe(20_000);
    expect(NEBIUS_MAX_RETRIES).toBe(2);
    expect(NEBIUS_RETRY_BACKOFF_MS).toBe(500);
    expect(NEBIUS_MAX_TOKENS_PER_JOURNEY).toBe(50_000);
    expect(NEBIUS_MAX_OUTPUT_TOKENS).toBe(2048);
    expect(NEBIUS_TEMPERATURE).toBe(0);
  });

  it("honours trimmed overrides and falls back on empty ones", () => {
    const config = nebiusConfigFromEnv({
      NEBIUS_API_KEY: "k",
      NEBIUS_BASE_URL: "  http://127.0.0.1:3099/v1  ",
      NEBIUS_MODEL: "custom-model",
    });
    expect(config?.baseUrl).toBe("http://127.0.0.1:3099/v1");
    expect(config?.model).toBe("custom-model");

    const blank = nebiusConfigFromEnv({
      NEBIUS_API_KEY: "k",
      NEBIUS_BASE_URL: "   ",
      NEBIUS_MODEL: "",
    });
    expect(blank?.baseUrl).toBe(NEBIUS_DEFAULT_BASE_URL);
    expect(blank?.model).toBe(NEBIUS_DEFAULT_MODEL);
  });

  it("never leaks the key into other fields", () => {
    const config = nebiusConfigFromEnv({ NEBIUS_API_KEY: "secret-key" });
    expect(JSON.stringify({ ...config, apiKey: undefined })).not.toContain(
      "secret-key",
    );
  });
});

describe("nebiusConfig", () => {
  it("merges overrides onto defaults", () => {
    const config = nebiusConfig({
      apiKey: "k",
      baseUrl: "http://localhost:3099",
      retryBackoffMs: 0,
    });
    expect(config.apiKey).toBe("k");
    expect(config.baseUrl).toBe("http://localhost:3099");
    expect(config.retryBackoffMs).toBe(0);
    expect(config.model).toBe(NEBIUS_DEFAULT_MODEL);
    expect(config.maxRetries).toBe(NEBIUS_MAX_RETRIES);
  });
});
