import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ render: vi.fn() }));

vi.mock("@/lib/generate/renderer", () => ({
  adRenderer: { render: mocks.render },
}));

import { renderedAdHref, type AdBrief, type PlannedConcept } from "@/lib/ad-run";
import { GET } from "./route";

const brief: AdBrief = {
  domain: "stripe.com",
  brandName: "Stripe",
  description: "Financial infrastructure for the internet.",
  industry: "Technology · Payments",
  summary: "Stripe provides programmable financial services.",
  mood: "modern, confident, premium",
  colorA: "vivid violet",
  colorB: "deep navy",
  logoUrl: "https://cdn.example/stripe.png",
  colors: [],
};

const concept: PlannedConcept = {
  key: "typographic",
  model: "openai/gpt-image-1",
  headline: "Move money",
  subheadline: "Financial infrastructure for every business",
};

const href = renderedAdHref(brief, concept);
const request = (path = href) => new Request(new URL(path, "https://branda.test"));

describe("GET /api/ad", () => {
  beforeEach(() => mocks.render.mockReset());

  it("rejects invalid input without rendering and never caches the error", async () => {
    const response = await GET(request("/api/ad?domain=not-enough"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid ad request." });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("redirects semantically valid noncanonical queries to their canonical GET href", async () => {
    const canonical = new URL(href, "https://branda.test");
    canonical.searchParams.set(
      "logo",
      "HTTPS://CDN.EXAMPLE:443/stripe.png#version",
    );
    const reversed = [...canonical.searchParams.entries()].reverse();
    canonical.search = new URLSearchParams(reversed).toString();

    const response = await GET(new Request(canonical));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`https://branda.test${href}`);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("maps missing generation readiness to a safe 503", async () => {
    mocks.render.mockResolvedValue({ ok: false, error: { code: "not_configured" } });

    const response = await GET(request());
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("temporarily unavailable");
    expect(body).not.toContain("AI_GATEWAY_API_KEY");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    { code: "generation_failed", retryable: true },
    { code: "generation_failed", retryable: false },
    { code: "aborted" },
  ])("maps $code to a retry-safe 502", async (error) => {
    mocks.render.mockResolvedValue({ ok: false, error });

    const response = await GET(request());

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "This ad failed to render. Try this slot again.",
    });
  });

  it("returns cacheable Rendered Ad bytes with canonical metadata headers", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    mocks.render.mockResolvedValue({
      ok: true,
      value: {
        bytes,
        mediaType: "image/png",
        concept: concept.key,
        model: concept.model,
      },
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect(response.headers.get("cdn-cache-control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect(response.headers.get("x-ad-concept")).toBe(concept.key);
    expect(response.headers.get("x-ad-model")).toBe(concept.model);
    expect(mocks.render).toHaveBeenCalledWith(
      expect.objectContaining({ canonicalHref: href }),
      expect.any(AbortSignal),
    );
  });
});
