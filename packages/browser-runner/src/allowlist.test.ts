import { describe, expect, it } from "vitest";

import {
  isAllowedRequestUrl,
  isAllowlistedUrl,
  sanitizeUrl,
} from "./allowlist";

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

describe("isAllowedRequestUrl", () => {
  const origin = "http://localhost:3001";

  it("allows every request to the exact trusted origin", () => {
    expect(isAllowedRequestUrl("http://localhost:3001/", origin)).toBe(true);
    expect(
      isAllowedRequestUrl("http://localhost:3001/membership?a=1#x", origin),
    ).toBe(true);
    expect(isAllowedRequestUrl("http://localhost:3001/_next/chunk.js", origin)).toBe(
      true,
    );
  });

  it("fails closed for foreign origins, ports, and schemes", () => {
    expect(isAllowedRequestUrl("https://localhost:3001/x", origin)).toBe(false);
    expect(isAllowedRequestUrl("http://localhost:3002/x", origin)).toBe(false);
    expect(isAllowedRequestUrl("http://127.0.0.1:3001/x", origin)).toBe(false);
    expect(isAllowedRequestUrl("https://evil.example/x", origin)).toBe(false);
    expect(isAllowedRequestUrl("http://localhost:3001.evil.example/x", origin)).toBe(
      false,
    );
    expect(isAllowedRequestUrl("javascript:alert(1)", origin)).toBe(false);
    expect(isAllowedRequestUrl("//evil.example/x", origin)).toBe(false);
    expect(isAllowedRequestUrl("not a url", origin)).toBe(false);
    expect(isAllowedRequestUrl("", origin)).toBe(false);
  });

  it("allows inert schemes that cannot perform network egress", () => {
    expect(isAllowedRequestUrl("data:text/html,x", origin)).toBe(true);
    expect(isAllowedRequestUrl("blob:http://localhost:3001/uuid", origin)).toBe(
      true,
    );
    expect(isAllowedRequestUrl("about:blank", origin)).toBe(true);
  });
});

describe("sanitizeUrl", () => {
  it("keeps origin and path but strips query strings and fragments", () => {
    expect(
      sanitizeUrl("http://localhost:3001/pixel.gif?secret=abc#frag"),
    ).toBe("http://localhost:3001/pixel.gif");
    expect(sanitizeUrl("http://evil.example/land?token=1")).toBe(
      "http://evil.example/land",
    );
  });

  it("never echoes unparseable input back", () => {
    expect(sanitizeUrl("not a url")).toBe("unparseable URL");
    expect(sanitizeUrl("")).toBe("unparseable URL");
  });
});
