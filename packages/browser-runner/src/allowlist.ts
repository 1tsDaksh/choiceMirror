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
