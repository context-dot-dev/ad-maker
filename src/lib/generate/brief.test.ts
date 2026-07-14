import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ generateObject: vi.fn() }));

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>();
  return { ...original, generateObject: mocks.generateObject };
});

import type { LanguageModel } from "ai";
import type { AdBrief } from "@/lib/ad-run";
import { imageModelById } from "./models";
import { deriveSummaryFromMarkdown, pickConceptsAndCraftCopy } from "./brief";

const brief: AdBrief = {
  domain: "stripe.com",
  brandName: "Stripe",
  description: "Financial infrastructure for the internet.",
  industry: "Technology · Payments",
  summary: "Stripe helps businesses accept payments and grow revenue.",
  mood: "bold, precise, optimistic",
  colorA: "rich indigo",
  colorB: "deep navy",
  logoUrl: null,
  colors: [{ hex: "#635bff", name: "Purple" }],
};

const model = {} as LanguageModel;

describe("Brief concept planning", () => {
  beforeEach(() => {
    mocks.generateObject.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("falls back to a complete, unique, primary-first plan when generation fails", async () => {
    mocks.generateObject.mockRejectedValue(new Error("Gateway unavailable"));

    const concepts = await pickConceptsAndCraftCopy(model, brief);

    expect(concepts).toHaveLength(6);
    expect(new Set(concepts.map(({ key }) => key)).size).toBe(6);
    expect(new Set(concepts.map(({ model: id }) => id)).size).toBe(6);
    expect(
      concepts.slice(0, 3).every(({ model: id }) => imageModelById(id)?.tier === "primary"),
    ).toBe(true);
    expect(
      concepts.slice(3).every(({ model: id }) => imageModelById(id)?.tier === "secondary"),
    ).toBe(true);
  });

  it("deduplicates generated directions, clamps copy, and pads missing concepts", async () => {
    mocks.generateObject.mockResolvedValue({
      object: {
        picks: [
          {
            concept: "typographic",
            headline: "One two three four five",
            subheadline: "one two three four five six seven eight nine ten eleven twelve thirteen",
          },
          {
            concept: "typographic",
            headline: "Duplicate",
            subheadline: "Must be discarded",
          },
        ],
      },
    });

    const concepts = await pickConceptsAndCraftCopy(model, brief);

    expect(concepts).toHaveLength(6);
    expect(new Set(concepts.map(({ key }) => key)).size).toBe(6);
    const generated = concepts.find(({ key }) => key === "typographic");
    expect(generated?.headline).toBe("One two three");
    expect(generated?.subheadline.split(/\s+/)).toHaveLength(12);
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
