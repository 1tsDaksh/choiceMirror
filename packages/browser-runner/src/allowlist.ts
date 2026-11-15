export function isAllowlistedUrl(
  rawUrl: string,
  allowedOrigins: string[],
): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

/**
 * Request-layer gate for browser-context interception: every outgoing request
 * must match the exact trusted origin. Inert schemes (data/blob/about) pass
 * because they cannot perform network egress; anything unparseable fails
 * closed. Tolerant of a trailing slash on the trusted origin because both
 * sides are compared as parsed origins.
 */
export function isAllowedRequestUrl(
  rawUrl: string,
  trustedOrigin: string,
): boolean {
  if (
    rawUrl.startsWith("data:") ||
    rawUrl.startsWith("blob:") ||
    rawUrl.startsWith("about:")
  ) {
    return true;
  }
  try {
    return new URL(rawUrl).origin === new URL(trustedOrigin).origin;
  } catch {
    return false;
  }
}

/**
 * Formats a URL for error/evidence text: origin and path only, never the
 * query string or fragment, so blocked-request messages cannot leak secrets.
 */
export function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "unparseable URL";
  }
}
