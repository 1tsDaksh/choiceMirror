/**
 * Thrown when an execution step crosses the origin boundary — an off-origin
 * navigation, redirect, or request observed at the request layer. The runner
 * classifies it as `blocked`. Messages must only ever contain URLs sanitized
 * with `sanitizeUrl` (no query strings or fragments).
 */
export class BlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedError";
  }
}
