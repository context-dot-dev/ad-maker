import { expect, test } from "vitest";
import {
  AD_RUN_SIZE,
  briefHref,
  decodeAdRunPlan,
  decodeRenderedAdQuery,
  renderedAdHref,
  type AdBrief,
  type PlannedConcept,
} from "./ad-run";
import { CREATIVE_DIRECTIONS } from "./generate/directions";
import { IMAGE_MODELS } from "./generate/models";

const brief: AdBrief = {
  domain: "stripe.com",
  brandName: "Stripe",
  description: "Financial infrastructure for the internet.",
  industry: "Technology · Payments",
  summary: "Stripe provides programmable financial services.",
  mood: "modern, confident, premium",
  colorA: "vivid violet",
  colorB: "deep navy",
  logoUrl: "https://cdn.example.com/stripe.png",
  colors: [{ hex: "#635bff", name: "Purple" }],
};

const concepts = CREATIVE_DIRECTIONS.slice(0, AD_RUN_SIZE).map(
  (direction, index) => ({
    key: direction.key,
    model: IMAGE_MODELS[index].id,
    headline: `Concept ${index + 1}`,
    subheadline: "A concise supporting line",
  }),
);

const plan = () => ({
  brief: {
    ...brief,
    colors: brief.colors.map((color) => ({ ...color })),
  },
  concepts: concepts.map((concept) => ({ ...concept })),
});

test("decodes exactly six distinct concepts and models with primary slots first", () => {
  const decoded = decodeAdRunPlan(plan());
  expect(decoded.concepts).toHaveLength(AD_RUN_SIZE);
  expect("label" in decoded.concepts[0]).toBe(false);
});

test("rejects malformed Ad Run invariants", () => {
  const short = plan();
  short.concepts.pop();
  expect(() => decodeAdRunPlan(short)).toThrow();

  const duplicateDirection = plan();
  duplicateDirection.concepts[1].key = duplicateDirection.concepts[0].key;
  expect(() => decodeAdRunPlan(duplicateDirection)).toThrow();

  const duplicateModel = plan();
  duplicateModel.concepts[1].model = duplicateModel.concepts[0].model;
  expect(() => decodeAdRunPlan(duplicateModel)).toThrow();

  const secondaryFirst = plan();
  [secondaryFirst.concepts[0].model, secondaryFirst.concepts[3].model] = [
    secondaryFirst.concepts[3].model,
    secondaryFirst.concepts[0].model,
  ];
  expect(() => decodeAdRunPlan(secondaryFirst)).toThrow();

  const nonCanonicalDomain = plan();
  nonCanonicalDomain.brief.domain = "www.stripe.com";
  expect(() => decodeAdRunPlan(nonCanonicalDomain)).toThrow();

  const longHeadline = plan();
  longHeadline.concepts[0].headline = "One two three four";
  expect(() => decodeAdRunPlan(longHeadline)).toThrow();

  const invalidColor = plan();
  invalidColor.brief.colors[0].hex = "url(javascript:alert(1))";
  expect(() => decodeAdRunPlan(invalidColor)).toThrow();

  const invalidLogo = plan();
  invalidLogo.brief.logoUrl = "file:///tmp/logo.png";
  expect(() => decodeAdRunPlan(invalidLogo)).toThrow();

  const privateLogo = plan();
  privateLogo.brief.logoUrl = "http://127.0.0.1/logo.png";
  expect(() => decodeAdRunPlan(privateLogo)).toThrow();
});

test("builds canonical GET hrefs in the existing fixed parameter order", () => {
  expect(briefHref("https://www.stripe.com/pricing")).toBe(
    "/api/brief?domain=stripe.com",
  );

  const href = renderedAdHref(brief, concepts[0] as PlannedConcept);
  const keys = [...new URL(href, "https://branda.test").searchParams.keys()];
  expect(keys).toEqual([
    "domain",
    "concept",
    "model",
    "headline",
    "sub",
    "name",
    "colorA",
    "colorB",
    "summary",
    "industry",
    "mood",
    "logo",
  ]);

  const decoded = decodeRenderedAdQuery(href);
  expect(decoded.domain).toBe(brief.domain);
  expect(decoded.concept).toBe(concepts[0].key);
  expect(decoded.canonicalHref).toBe(href);

  const noncanonicalLogoHref = renderedAdHref(
    {
      ...brief,
      logoUrl: "HTTPS://CDN.EXAMPLE.COM:443/stripe.png#version",
    },
    concepts[0] as PlannedConcept,
  );
  expect(
    new URL(noncanonicalLogoHref, "https://branda.test").searchParams.get(
      "logo",
    ),
  ).toBe("https://cdn.example.com/stripe.png");
});

test("rejects duplicate, unknown, and noncanonical Rendered Ad parameters", () => {
  const href = renderedAdHref(brief, concepts[0] as PlannedConcept);
  expect(() =>
    decodeRenderedAdQuery(`${href}&model=${concepts[0].model}`),
  ).toThrow();
  expect(() => decodeRenderedAdQuery(`${href}&unexpected=true`)).toThrow();
  expect(() =>
    decodeRenderedAdQuery(href.replace("stripe.com", "www.stripe.com")),
  ).toThrow();
});
