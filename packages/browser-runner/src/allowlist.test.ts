import { describe, expect, it } from "vitest";

import { isAllowlistedUrl } from "./allowlist";

const allowed = ["http://localhost:3001"];

describe("isAllowlistedUrl", () => {
  it("allows the exact benchmark origin", () => {
    expect(
      isAllowlistedUrl("http://localhost:3001/membership-balanced", allowed),
    ).toBe(true);
  });

  it("blocks foreign origins and lookalike hosts", () => {
    expect(isAllowlistedUrl("https://evil.com", allowed)).toBe(false);
    expect(isAllowlistedUrl("http://localhost:3002", allowed)).toBe(false);
    expect(isAllowlistedUrl("http://localhost:3001.evil.com", allowed)).toBe(
      false,
    );
    expect(isAllowlistedUrl("https://localhost:3001", allowed)).toBe(false);
  });

  it("blocks non-http schemes and unparseable input", () => {
    expect(isAllowlistedUrl("javascript:alert(1)", allowed)).toBe(false);
    expect(isAllowlistedUrl("data:text/html,x", allowed)).toBe(false);
    expect(isAllowlistedUrl("//evil.com", allowed)).toBe(false);
    expect(isAllowlistedUrl("not a url", allowed)).toBe(false);
    expect(isAllowlistedUrl("", allowed)).toBe(false);
  });
});
