import { describe, expect, it, vi } from "vitest";
import type { PlannedConcept, Six } from "@/lib/ad-run";
import type { BrandProfile } from "@/lib/context";
import {
  createAdRunPlanner,
  type AdRunPlannerAdapters,
} from "./planner";

const CONCEPTS: Six<PlannedConcept> = [
  { key: "product_hero", model: "openai/gpt-image-1", headline: "Move Faster", subheadline: "Payments built for internet businesses" },
  { key: "isometric", model: "openai/gpt-image-2", headline: "Build Boldly", subheadline: "A financial platform for ambitious teams" },
  { key: "typographic", model: "xai/grok-imagine-image", headline: "Own Tomorrow", subheadline: "Tools that make online commerce simple" },
  { key: "macro_material", model: "google/imagen-4.0-generate-001", headline: "Scale Smoothly", subheadline: "Reliable infrastructure for every payment" },
  { key: "gradient_field", model: "bytedance/seedream-4.5", headline: "Grow Globally", subheadline: "Reach customers around the world" },
  { key: "editorial_spread", model: "recraft/recraft-v4.1", headline: "Start Now", subheadline: "Everything your business needs to grow" },
];

const BRAND: BrandProfile = {
  domain: "stripe.com",
  name: "Stripe",
  description: "Financial infrastructure for the internet.",
  slogan: "Grow your revenue",
  industry: "Technology · Payments",
  logoUrl: "https://cdn.stripe.com/logo.png",
  colors: [
    { hex: "#635bff", name: "Blurple" },
    { hex: "#0a2540", name: "Navy" },
  ],
};

type FlatTestAdapters = {
  hasContextConfiguration: () => boolean;
  hasGenerationConfiguration: () => boolean;
  fetchBrand: AdRunPlannerAdapters["research"]["fetchBrand"];
  scrapePage: AdRunPlannerAdapters["research"]["scrapePage"];
  fetchMood: AdRunPlannerAdapters["research"]["fetchMood"];
  planConcepts: AdRunPlannerAdapters["concepts"]["planConcepts"];
};

function adapters(overrides: Partial<FlatTestAdapters> = {}) {
  const flat: FlatTestAdapters = {
    hasContextConfiguration: vi.fn(() => true),
    hasGenerationConfiguration: vi.fn(() => true),
    fetchBrand: vi.fn(async () => BRAND),
    scrapePage: vi.fn(async () =>
      "Stripe helps businesses accept online payments around the world.",
    ),
    fetchMood: vi.fn(async () => "bold, precise, optimistic"),
    planConcepts: vi.fn(async () => CONCEPTS),
    ...overrides,
  };
  return {
    research: {
      isReady: flat.hasContextConfiguration,
      fetchBrand: flat.fetchBrand,
      scrapePage: flat.scrapePage,
      fetchMood: flat.fetchMood,
    },
    concepts: {
      isReady: flat.hasGenerationConfiguration,
      planConcepts: flat.planConcepts,
    },
    ...flat,
  } satisfies AdRunPlannerAdapters & FlatTestAdapters;
}

describe("createAdRunPlanner", () => {
  it("normalizes the domain and returns a contract-validated Ad Run", async () => {
    const deps = adapters();
    const result = await createAdRunPlanner(deps)(
      "https://www.Stripe.com/pricing",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brief).toMatchObject({
      domain: "stripe.com",
      brandName: "Stripe",
      industry: "Technology · Payments",
      mood: "bold, precise, optimistic",
      colorA: "rich indigo",
      colorB: "deep navy",
    });
    expect(result.value.brief.summary).toContain("accept online payments");
    expect(result.value.concepts).toEqual(CONCEPTS);
    expect(deps.fetchBrand).toHaveBeenCalledWith("stripe.com", undefined);
    expect(deps.scrapePage).toHaveBeenCalledWith("https://stripe.com", undefined);
    expect(deps.fetchMood).toHaveBeenCalledWith("stripe.com", undefined);
    expect(deps.planConcepts).toHaveBeenCalledWith(result.value.brief, undefined);
  });

  it("bounds the flat Brief before passing it to concept planning", async () => {
    const deps = adapters({
      fetchBrand: vi.fn(async () => ({
        ...BRAND,
        name: ` Stripe ${"x".repeat(100)}`,
        description: ` ${"d".repeat(2200)}`,
        industry: ` ${"i".repeat(150)}`,
        logoUrl: `https://example.com/${"x".repeat(2100)}`,
        colors: Array.from({ length: 10 }, (_, index) => ({
          hex: index % 2 ? "#635bff" : "#0a2540",
          name: "n".repeat(100),
        })),
      })),
      fetchMood: vi.fn(async () => ` ${"m".repeat(200)}`),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brief.brandName).toHaveLength(80);
    expect(result.value.brief.description).toHaveLength(2000);
    expect(result.value.brief.industry).toHaveLength(120);
    expect(result.value.brief.mood).toHaveLength(160);
    expect(result.value.brief.logoUrl).toBeNull();
    expect(result.value.brief.colors).toHaveLength(8);
    expect(result.value.brief.colors[0].name).toHaveLength(80);
  });

  it("uses an empty homepage summary when only the page fails", async () => {
    const deps = adapters({
      scrapePage: vi.fn(async () => {
        throw new Error("page unavailable");
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brief.summary).toBe("");
    expect(deps.planConcepts).toHaveBeenCalledOnce();
  });

  it("uses the default mood when only mood enrichment fails", async () => {
    const deps = adapters({
      fetchMood: vi.fn(async () => {
        throw new Error("mood unavailable");
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brief.mood).toBe("modern, confident, premium");
  });

  it("uses the default mood when enrichment returns an empty value", async () => {
    const result = await createAdRunPlanner(
      adapters({ fetchMood: vi.fn(async () => "   ") }),
    )("stripe.com");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brief.mood).toBe("modern, confident, premium");
  });

  it("returns domain-unreachable when Brand and homepage both fail", async () => {
    const deps = adapters({
      fetchBrand: vi.fn(async () => {
        throw new Error("brand unavailable");
      }),
      scrapePage: vi.fn(async () => {
        throw new Error("page unavailable");
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result).toMatchObject({
      ok: false,
      error: { code: "domain-unreachable" },
    });
    expect(deps.planConcepts).not.toHaveBeenCalled();
  });

  it("returns brand-unavailable when Brand fails but homepage succeeds", async () => {
    const deps = adapters({
      fetchBrand: vi.fn(async () => {
        throw new Error("brand unavailable");
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result).toMatchObject({
      ok: false,
      error: { code: "brand-unavailable" },
    });
    expect(deps.planConcepts).not.toHaveBeenCalled();
  });

  it("returns invalid-domain without checking readiness or doing I/O", async () => {
    const deps = adapters();
    const result = await createAdRunPlanner(deps)("localhost");

    expect(result).toEqual({ ok: false, error: { code: "invalid-domain" } });
    expect(deps.hasContextConfiguration).not.toHaveBeenCalled();
    expect(deps.hasGenerationConfiguration).not.toHaveBeenCalled();
    expect(deps.fetchBrand).not.toHaveBeenCalled();
  });

  it.each([
    [false, true],
    [true, false],
    [false, false],
  ])(
    "short-circuits all external work when readiness is context=%s generation=%s",
    async (contextReady, generationReady) => {
      const deps = adapters({
        hasContextConfiguration: vi.fn(() => contextReady),
        hasGenerationConfiguration: vi.fn(() => generationReady),
      });

      const result = await createAdRunPlanner(deps)("stripe.com");

      expect(result).toEqual({ ok: false, error: { code: "not-configured" } });
      expect(deps.hasContextConfiguration).toHaveBeenCalledOnce();
      expect(deps.hasGenerationConfiguration).toHaveBeenCalledOnce();
      expect(deps.fetchBrand).not.toHaveBeenCalled();
      expect(deps.scrapePage).not.toHaveBeenCalled();
      expect(deps.fetchMood).not.toHaveBeenCalled();
      expect(deps.planConcepts).not.toHaveBeenCalled();
    },
  );

  it("propagates cancellation and stops before concept planning", async () => {
    const controller = new AbortController();
    const deps = adapters({
      fetchBrand: vi.fn(async (_domain, signal) => {
        expect(signal).toBe(controller.signal);
        controller.abort();
        return BRAND;
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com", controller.signal);

    expect(result).toEqual({ ok: false, error: { code: "aborted" } });
    expect(deps.planConcepts).not.toHaveBeenCalled();
  });

  it("turns concept-planning failures into a typed internal failure", async () => {
    const deps = adapters({
      planConcepts: vi.fn(async () => {
        throw new Error("director unavailable");
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result).toMatchObject({ ok: false, error: { code: "internal" } });
  });

  it("rejects a plan that violates the shared Ad Run contract", async () => {
    const duplicate = CONCEPTS.map((concept) => ({ ...concept }));
    duplicate[1] = { ...duplicate[0], model: duplicate[1].model };
    const deps = adapters({
      planConcepts: vi.fn(async () => duplicate as unknown as Six<PlannedConcept>),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result).toMatchObject({ ok: false, error: { code: "internal" } });
  });
});
