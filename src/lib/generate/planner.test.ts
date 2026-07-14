import { describe, expect, it, vi } from "vitest";
import type { PlannedConcept, Product } from "@/lib/ad-run";
import type { BrandProfile, StyleguideProfile } from "@/lib/context";
import {
  createAdRunPlanner,
  type AdRunPlannerAdapters,
} from "./planner";

const PRODUCTS: Product[] = [
  {
    name: "Payment Links",
    description: "Create a payment page and share its link with customers.",
  },
  {
    name: "Stripe Billing",
    description: "Manage subscriptions, invoices, and recurring revenue.",
  },
  {
    name: "Stripe Checkout",
    description: "Use a prebuilt payment form for online purchases.",
  },
];

const CONCEPTS: readonly PlannedConcept[] = [
  {
    key: "product_hero",
    model: "openai/gpt-image-1",
    subject: { kind: "company" },
    headline: "Move Faster",
    subheadline: "Payments built for internet businesses",
  },
  {
    key: "isometric",
    model: "openai/gpt-image-2",
    subject: { kind: "company" },
    headline: "Build Boldly",
    subheadline: "A financial platform for ambitious teams",
  },
  {
    key: "typographic",
    model: "xai/grok-imagine-image",
    subject: { kind: "company" },
    headline: "Own Tomorrow",
    subheadline: "Tools that make online commerce simple",
  },
  {
    key: "macro_material",
    model: "google/imagen-4.0-generate-001",
    subject: { kind: "product", ...PRODUCTS[0] },
    headline: "Share. Sell. Done.",
    subheadline: "Launch a payment page from one simple link",
  },
  {
    key: "gradient_field",
    model: "bytedance/seedream-4.5",
    subject: { kind: "product", ...PRODUCTS[1] },
    headline: "Billing That Grows",
    subheadline: "Subscriptions and invoices built to scale",
  },
  {
    key: "editorial_spread",
    model: "recraft/recraft-v4.1",
    subject: { kind: "product", ...PRODUCTS[2] },
    headline: "Checkout, Simplified",
    subheadline: "A prebuilt payment form customers recognize",
  },
];

const BRAND: BrandProfile = {
  domain: "stripe.com",
  name: "Stripe",
  description: "Financial infrastructure for the internet.",
  slogan: "Grow your revenue",
  industry: "Technology · Payments",
  logoUrl: "https://cdn.stripe.com/logo.png",
};

const STYLEGUIDE: StyleguideProfile = {
  mood: "bold, precise, optimistic",
  colors: [
    { hex: "#635bff", name: "Blurple" },
    { hex: "#0a2540", name: "Navy" },
  ],
  fontFamily: "Inter",
};

type FlatTestAdapters = {
  hasContextConfiguration: () => boolean;
  hasGenerationConfiguration: () => boolean;
  fetchBrand: AdRunPlannerAdapters["research"]["fetchBrand"];
  scrapePage: AdRunPlannerAdapters["research"]["scrapePage"];
  fetchStyleguide: AdRunPlannerAdapters["research"]["fetchStyleguide"];
  fetchProducts: AdRunPlannerAdapters["research"]["fetchProducts"];
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
    fetchStyleguide: vi.fn(async () => STYLEGUIDE),
    fetchProducts: vi.fn(async () => PRODUCTS),
    planConcepts: vi.fn(async () => CONCEPTS),
    ...overrides,
  };
  return {
    research: {
      isReady: flat.hasContextConfiguration,
      fetchBrand: flat.fetchBrand,
      scrapePage: flat.scrapePage,
      fetchStyleguide: flat.fetchStyleguide,
      fetchProducts: flat.fetchProducts,
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
      fontFamily: "Inter",
      colorA: "rich indigo",
      colorB: "deep navy",
    });
    expect(result.value.brief.summary).toContain("accept online payments");
    expect(result.value.concepts).toEqual(CONCEPTS);
    expect(deps.fetchBrand).toHaveBeenCalledWith("stripe.com", undefined);
    expect(deps.scrapePage).toHaveBeenCalledWith("https://stripe.com", undefined);
    expect(deps.fetchStyleguide).toHaveBeenCalledWith("stripe.com", undefined);
    expect(deps.fetchProducts).toHaveBeenCalledWith("stripe.com", undefined);
    expect(result.value.concepts.slice(0, 3).map(({ subject }) => subject)).toEqual([
      { kind: "company" },
      { kind: "company" },
      { kind: "company" },
    ]);
    expect(result.value.concepts.slice(3).map(({ subject }) => subject)).toEqual(
      PRODUCTS.map((product) => ({ kind: "product", ...product })),
    );
    expect(deps.planConcepts).toHaveBeenCalledWith(
      result.value.brief,
      PRODUCTS,
      undefined,
    );
  });

  it("bounds the flat Brief before passing it to concept planning", async () => {
    const deps = adapters({
      fetchBrand: vi.fn(async () => ({
        ...BRAND,
        name: ` Stripe ${"x".repeat(100)}`,
        description: ` ${"d".repeat(2200)}`,
        industry: ` ${"i".repeat(150)}`,
        logoUrl: `https://example.com/${"x".repeat(2100)}`,
      })),
      fetchStyleguide: vi.fn(async () => ({
        mood: ` ${"m".repeat(200)}`,
        colors: Array.from({ length: 10 }, (_, index) => ({
          hex: index % 2 ? "#635bff" : "#0a2540",
          name: "n".repeat(100),
        })),
        fontFamily: "f".repeat(101),
      })),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brief.brandName).toHaveLength(80);
    expect(result.value.brief.description).toHaveLength(2000);
    expect(result.value.brief.industry).toHaveLength(120);
    expect(result.value.brief.mood).toHaveLength(160);
    expect(result.value.brief.logoUrl).toBeNull();
    expect(result.value.brief.fontFamily).toBeNull();
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

  it("uses palette and typography defaults when styleguide enrichment fails", async () => {
    const deps = adapters({
      fetchStyleguide: vi.fn(async () => {
        throw new Error("styleguide unavailable");
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brief.mood).toBe("modern, confident, premium");
    expect(result.value.brief.colors).toEqual([]);
    expect(result.value.brief.fontFamily).toBeNull();
    expect(result.value.brief.colorA).toBe("vivid violet");
    expect(result.value.brief.colorB).toBe("deep navy");
  });

  it("uses the default mood when enrichment returns an empty value", async () => {
    const result = await createAdRunPlanner(
      adapters({
        fetchStyleguide: vi.fn(async () => ({
          ...STYLEGUIDE,
          mood: "   ",
        })),
      }),
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

  it("returns products-unavailable when Product extraction fails", async () => {
    const failure = new Error("products unavailable");
    const deps = adapters({
      fetchProducts: vi.fn(async () => {
        throw failure;
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result).toEqual({
      ok: false,
      error: { code: "products-unavailable", cause: failure },
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
    expect(deps.fetchProducts).not.toHaveBeenCalled();
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
      expect(deps.fetchStyleguide).not.toHaveBeenCalled();
      expect(deps.fetchProducts).not.toHaveBeenCalled();
      expect(deps.planConcepts).not.toHaveBeenCalled();
    },
  );

  it("propagates cancellation and stops before concept planning", async () => {
    const controller = new AbortController();
    const deps = adapters({
      fetchProducts: vi.fn(async (_domain, signal) => {
        expect(signal).toBe(controller.signal);
        controller.abort();
        return PRODUCTS;
      }),
    });

    const result = await createAdRunPlanner(deps)("stripe.com", controller.signal);

    expect(result).toEqual({ ok: false, error: { code: "aborted" } });
    expect(deps.fetchBrand).toHaveBeenCalledWith("stripe.com", controller.signal);
    expect(deps.scrapePage).toHaveBeenCalledWith(
      "https://stripe.com",
      controller.signal,
    );
    expect(deps.fetchStyleguide).toHaveBeenCalledWith(
      "stripe.com",
      controller.signal,
    );
    expect(deps.fetchProducts).toHaveBeenCalledWith(
      "stripe.com",
      controller.signal,
    );
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
      planConcepts: vi.fn(async () => duplicate),
    });

    const result = await createAdRunPlanner(deps)("stripe.com");

    expect(result).toMatchObject({ ok: false, error: { code: "internal" } });
  });
});
