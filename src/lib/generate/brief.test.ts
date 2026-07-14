import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ generateObject: vi.fn() }));

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>();
  return { ...original, generateObject: mocks.generateObject };
});

import type { LanguageModel } from "ai";
import type { AdBrief, Product } from "@/lib/ad-run";
import { imageModelById } from "./models";
import { deriveSummaryFromMarkdown, pickConceptsAndCraftCopy } from "./brief";

const brief: AdBrief = {
  domain: "stripe.com",
  brandName: "Stripe",
  description: "Financial infrastructure for the internet.",
  industry: "Technology · Payments",
  summary: "Stripe helps businesses accept payments and grow revenue.",
  mood: "bold, precise, optimistic",
  fontFamily: "Inter",
  colorA: "rich indigo",
  colorB: "deep navy",
  logoUrl: null,
  colors: [{ hex: "#635bff", name: "Purple" }],
};

const PRODUCTS: readonly Product[] = [
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

const model = {} as LanguageModel;

describe("Brief concept planning", () => {
  beforeEach(() => {
    mocks.generateObject.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it.each([1, 2, 3] as const)(
    "falls back to three Company concepts plus %i grounded Product concept(s)",
    async (productCount) => {
      mocks.generateObject.mockRejectedValue(new Error("Gateway unavailable"));
      const products = PRODUCTS.slice(0, productCount);

      const concepts = await pickConceptsAndCraftCopy(model, brief, products);

      expect(concepts).toHaveLength(3 + productCount);
      expect(new Set(concepts.map(({ key }) => key)).size).toBe(
        concepts.length,
      );
      expect(new Set(concepts.map(({ model: id }) => id)).size).toBe(
        concepts.length,
      );
      expect(concepts.slice(0, 3).map(({ subject }) => subject)).toEqual([
        { kind: "company" },
        { kind: "company" },
        { kind: "company" },
      ]);
      expect(
        concepts
          .slice(0, 3)
          .every(({ model: id }) => imageModelById(id)?.tier === "primary"),
      ).toBe(true);

      const productConcepts = concepts.slice(3);
      expect(productConcepts.map(({ subject }) => subject)).toEqual(
        products.map((product) => ({ kind: "product", ...product })),
      );
      expect(
        productConcepts.every(
          ({ model: id }) => imageModelById(id)?.tier === "secondary",
        ),
      ).toBe(true);
      expect(productConcepts.map(({ headline }) => headline)).toEqual(
        products.map(({ name }) => name),
      );
    },
  );

  it("maps generated Product copy by input order, clamps it, and pads duplicate directions", async () => {
    mocks.generateObject.mockResolvedValue({
      object: {
        companyPicks: [
          {
            concept: "typographic",
            headline: "One two three four five",
            subheadline:
              "one two three four five six seven eight nine ten eleven twelve thirteen",
          },
          {
            concept: "typographic",
            headline: "Duplicate",
            subheadline: "This duplicate direction must be discarded",
          },
          {
            concept: "isometric",
            headline: "Built to grow",
            subheadline: "Financial infrastructure for ambitious teams",
          },
        ],
        productPicks: [
          {
            concept: "isometric",
            headline: "Duplicate product direction",
            subheadline: "This conflicts with a company direction",
          },
          {
            concept: "macro_material",
            headline: "Automate every recurring invoice today",
            subheadline:
              "one two three four five six seven eight nine ten eleven twelve thirteen",
          },
        ],
      },
    });

    const products = PRODUCTS.slice(0, 2);
    const concepts = await pickConceptsAndCraftCopy(model, brief, products);

    expect(concepts).toHaveLength(5);
    expect(new Set(concepts.map(({ key }) => key)).size).toBe(5);
    expect(concepts.slice(0, 3).every(({ subject }) => subject.kind === "company"))
      .toBe(true);
    expect(concepts.slice(3).map(({ subject }) => subject)).toEqual(
      products.map((product) => ({ kind: "product", ...product })),
    );

    const generatedCompany = concepts.find(({ key }) => key === "typographic");
    expect(generatedCompany?.headline).toBe("One two three");
    expect(generatedCompany?.subheadline.split(/\s+/)).toHaveLength(12);
    expect(concepts.filter(({ key }) => key === "typographic")).toHaveLength(1);

    const fallbackProduct = concepts[3];
    expect(fallbackProduct.subject).toEqual({
      kind: "product",
      ...products[0],
    });
    expect(fallbackProduct.headline).toBe("Payment Links");

    const generatedProduct = concepts[4];
    expect(generatedProduct).toMatchObject({
      key: "macro_material",
      subject: { kind: "product", ...products[1] },
      headline: "Automate every recurring",
    });
    expect(generatedProduct.subheadline.split(/\s+/)).toHaveLength(12);

    const request = mocks.generateObject.mock.calls[0][0] as {
      prompt: string;
      system: string;
    };
    expect(request.system).toContain("exactly 2 product picks");
    expect(request.prompt).toContain(
      `1. ${products[0].name} — ${products[0].description}`,
    );
    expect(request.prompt).toContain(
      `2. ${products[1].name} — ${products[1].description}`,
    );
  });

  it.each([
    [[] as Product[]],
    [
      [
        ...PRODUCTS,
        {
          name: "Stripe Tax",
          description: "Automate sales tax calculations and collection.",
        },
      ] as Product[],
    ],
  ])("rejects a Product count outside the 1-3 contract", async (products) => {
    await expect(
      pickConceptsAndCraftCopy(model, brief, products),
    ).rejects.toThrow("Concept planning requires 1-3 Products");
    expect(mocks.generateObject).not.toHaveBeenCalled();
  });

  it("derives prose while dropping headings, links, calls to action, and stats", () => {
    const markdown = [
      "# Stripe",
      "[Products](/products)",
      "Get started",
      "Stripe helps businesses accept payments around the world.",
      "Revenue grew 40% last year.",
      "Teams can launch new financial products without rebuilding infrastructure.",
    ].join("\n");

    expect(deriveSummaryFromMarkdown(markdown)).toBe(
      "Stripe helps businesses accept payments around the world. Teams can launch new financial products without rebuilding infrastructure.",
    );
  });
});
