export const NEBIUS_DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
export const NEBIUS_DEFAULT_MODEL = "zai-org/GLM-5.3-Flash";
export const PROMPT_VERSION = "phase3-v1";
export const NEBIUS_TIMEOUT_MS = 20_000;
export const NEBIUS_MAX_RETRIES = 2;
export const NEBIUS_RETRY_BACKOFF_MS = 500;
export const NEBIUS_MAX_TOKENS_PER_JOURNEY = 50_000;
// Raised from the planned 300 on live evidence (2026-11-16): the model is a
// reasoning model that emitted finish_reason=length with >1200 reasoning
// tokens and empty content at 300, failing journeys as "invalid response
// body". 2048 covers observed reasoning (237–1217 tokens) plus the action.
export const NEBIUS_MAX_OUTPUT_TOKENS = 2048;
export const NEBIUS_TEMPERATURE = 0;

export type NebiusConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  maxTokensPerJourney: number;
  maxOutputTokens: number;
  temperature: number;
};

function envOverride(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/**
 * Server-side configuration only: the API key is read from the environment
 * and never leaves the server process. Returns null when unconfigured so the
 * app can report "AI mode not configured" instead of failing at request time.
 */
export function nebiusConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): NebiusConfig | null {
  const apiKey = env.NEBIUS_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return nebiusConfig({
    apiKey,
    baseUrl: envOverride(env.NEBIUS_BASE_URL, NEBIUS_DEFAULT_BASE_URL),
    model: envOverride(env.NEBIUS_MODEL, NEBIUS_DEFAULT_MODEL),
  });
}

export function nebiusConfig(
  overrides: Partial<NebiusConfig> & { apiKey: string },
): NebiusConfig {
  return {
    apiKey: overrides.apiKey,
    baseUrl: overrides.baseUrl ?? NEBIUS_DEFAULT_BASE_URL,
    model: overrides.model ?? NEBIUS_DEFAULT_MODEL,
    timeoutMs: overrides.timeoutMs ?? NEBIUS_TIMEOUT_MS,
    maxRetries: overrides.maxRetries ?? NEBIUS_MAX_RETRIES,
    retryBackoffMs: overrides.retryBackoffMs ?? NEBIUS_RETRY_BACKOFF_MS,
    maxTokensPerJourney:
      overrides.maxTokensPerJourney ?? NEBIUS_MAX_TOKENS_PER_JOURNEY,
    maxOutputTokens: overrides.maxOutputTokens ?? NEBIUS_MAX_OUTPUT_TOKENS,
    temperature: overrides.temperature ?? NEBIUS_TEMPERATURE,
  };
}
