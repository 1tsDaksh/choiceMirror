export const limits = {
  MAX_ACTIONS: 10,
  STEP_TIMEOUT_MS: 10_000,
  JOURNEY_TIMEOUT_MS: 60_000,
  VIEWPORT: { width: 1280, height: 720 },
  /** AI journeys: maximum model decisions (observe→decide→execute cycles). */
  MAX_AI_DECISIONS: 12,
  /** AI journeys: maximum policy-rejected proposals before explicit stop. */
  AI_MAX_REJECTED: 6,
} as const;
