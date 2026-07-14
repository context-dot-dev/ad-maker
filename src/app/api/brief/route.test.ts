import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ planAdRun: vi.fn() }));

vi.mock("@/lib/generate/planner", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/generate/planner")>();
  return { ...original, planAdRun: mocks.planAdRun };
});

import type { AdRunPlan } from "@/lib/ad-run";
import { CREATIVE_DIRECTIONS } from "@/lib/generate/directions";
import { IMAGE_MODELS } from "@/lib/generate/models";
import { GET } from "./route";

const plan: AdRunPlan = {
  brief: {
    domain: "stripe.com",
    brandName: "Stripe",
    description: "Financial infrastructure for the internet.",
    industry: "Technology · Payments",
    summary: "Stripe provides programmable financial services.",
    mood: "modern, confident, premium",
    colorA: "rich indigo",
    colorB: "deep navy",
    logoUrl: null,
    colors: [{ hex: "#635bff", name: "Purple" }],
  },
  concepts: [0, 1, 2, 3, 4, 5].map((index) => ({
    key: CREATIVE_DIRECTIONS[index].key,
    model: IMAGE_MODELS[index].id,
    headline: `Concept ${index + 1}`,
    subheadline: "A concise supporting line",
  })) as unknown as AdRunPlan["concepts"],
};

const request = (domain = "stripe.com") =>
  new Request(`https://branda.test/api/brief?domain=${encodeURIComponent(domain)}`);

describe("GET /api/brief", () => {
  beforeEach(() => {
    mocks.planAdRun.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns the validated Ad Run with canonical cache headers", async () => {
    mocks.planAdRun.mockResolvedValue({ ok: true, value: plan });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(plan);
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(response.headers.get("cdn-cache-control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(mocks.planAdRun).toHaveBeenCalledWith(
      "stripe.com",
      expect.any(AbortSignal),
    );
  });

  it("redirects equivalent domains to one canonical cache key before planning", async () => {
    const response = await GET(request("HTTPS://WWW.Stripe.com/pricing"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://branda.test/api/brief?domain=stripe.com",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.planAdRun).not.toHaveBeenCalled();
  });

  it.each([
    "/api/brief?domain=stripe.com&domain=linear.app",
    "/api/brief?domain=stripe.com&extra=true",
  ])("rejects ambiguous query %s", async (path) => {
    const response = await GET(new Request(new URL(path, "https://branda.test")));

    expect(response.status).toBe(400);
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(mocks.planAdRun).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid-domain", 400],
    ["not-configured", 503],
    ["aborted", 499],
    ["domain-unreachable", 502],
    ["brand-unavailable", 502],
    ["internal", 500],
  ] as const)("maps %s to a no-store %s", async (code, status) => {
    const error =
      code === "internal" || code === "domain-unreachable" || code === "brand-unavailable"
        ? { code, cause: new Error("private deployment detail") }
        : { code };
    mocks.planAdRun.mockResolvedValue({ ok: false, error });

    const response = await GET(request());
    const body = await response.text();

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).not.toContain("AI_GATEWAY_API_KEY");
    expect(body).not.toContain("private deployment detail");
  });
});
