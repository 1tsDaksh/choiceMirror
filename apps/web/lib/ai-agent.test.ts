import { afterEach, describe, expect, it, vi } from "vitest";

import { aiModelId, createAiAgent, isAiConfigured } from "./ai-agent";

describe("ai-agent configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports unconfigured and creates no agent without an API key", () => {
    vi.stubEnv("NEBIUS_API_KEY", "");

    expect(isAiConfigured()).toBe(false);
    expect(createAiAgent()).toBeNull();
  });

  it("creates a fresh agent per call and honors the model override", () => {
    vi.stubEnv("NEBIUS_API_KEY", "test-key");
    vi.stubEnv("NEBIUS_MODEL", "custom/model");

    expect(isAiConfigured()).toBe(true);

    const first = createAiAgent();
    const second = createAiAgent();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Fresh instance per journey: per-journey budgets never leak across runs.
    expect(second).not.toBe(first);
    expect(first?.summary().model).toBe("custom/model");
    expect(aiModelId()).toBe("custom/model");
  });

  it("falls back to the default model when only the key is set", () => {
    vi.stubEnv("NEBIUS_API_KEY", "test-key");
    vi.stubEnv("NEBIUS_MODEL", "   ");

    expect(isAiConfigured()).toBe(true);
    expect(aiModelId()).toBe("zai-org/GLM-5.3-Flash");
  });

  it("never exposes the key through the model id", () => {
    vi.stubEnv("NEBIUS_API_KEY", "secret-key-value");

    expect(aiModelId()).not.toContain("secret-key-value");
    expect(JSON.stringify(createAiAgent()?.summary() ?? {})).not.toContain(
      "secret-key-value",
    );
  });
});
