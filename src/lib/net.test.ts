import { describe, expect, it } from "vitest";
import { normalizeDomain } from "./net";

describe("normalizeDomain", () => {
  it("canonicalizes schemes, www, case, paths, and whitespace", () => {
    expect(normalizeDomain("  HTTPS://WWW.Stripe.COM/pricing?q=1  ")).toBe("stripe.com");
  });

  it.each([
    "",
    "localhost",
    "https://app.localhost",
    "https://127.0.0.1/path",
    "https://8.8.8.8",
    "http://10.0.0.1",
    "https://service.internal",
    "not a domain",
  ])("rejects invalid or private input %s", (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });

  it("rejects a syntactically labelled hostname beyond the DNS limit", () => {
    const label = "a".repeat(63);
    expect(normalizeDomain(`${label}.${label}.${label}.${label}`)).toBeNull();
  });
});
