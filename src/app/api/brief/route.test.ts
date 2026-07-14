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
    fontFamily: "Inter",
    colorA: "rich indigo",
    colorB: "deep navy",
    logoUrl: null,
    colors: [{ hex: "#635bff", name: "Purple" }],
  },
  concepts: [0, 1, 2, 3].map((index) => ({
    key: CREATIVE_DIRECTIONS[index].key,
    model: IMAGE_MODELS[index].id,
    subject:
      index < 3
        ? { kind: "company" as const }
        : {
            kind: "product" as const,
            name: "Payments",
            description: "Accept payments online and in person.",
          },
    headline: `Concept ${index + 1}`,
    subheadline: "A concise supporting line",
  })),
};

const request = (domain = "stripe.com", version: string | null = "3") => {
  const params = new URLSearchParams({ domain });
  if (version !== null) params.set("v", version);
  return new Request(`https://branda.test/api/brief?${params.toString()}`);
};

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

  it.each([
    ["an unversioned request", "stripe.com", null],
    ["an old format version", "stripe.com", "2"],
    ["an equivalent domain", "HTTPS://WWW.Stripe.com/pricing", "3"],
  ] as const)(
    "redirects %s to the versioned canonical cache key before planning",
    async (_label, domain, version) => {
      const response = await GET(request(domain, version));

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "https://branda.test/api/brief?domain=stripe.com&v=3",
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(mocks.planAdRun).not.toHaveBeenCalled();
    },
  );

  it.each([
    "/api/brief?domain=stripe.com&domain=linear.app",
    "/api/brief?domain=stripe.com&v=3&v=3",
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
    ["products-unavailable", 502],
    ["internal", 500],
  ] as const)("maps %s to a no-store %s", async (code, status) => {
    const error =
      code === "internal" ||
      code === "domain-unreachable" ||
      code === "brand-unavailable" ||
      code === "products-unavailable"
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
