import ContextDev from "context.dev";
import { zodSchema } from "ai";
import { z } from "zod";
import {
  normalizeBrandColorHex,
  type BrandColor,
} from "@/lib/brand-color";
import { normalizeFontFamily } from "@/lib/font-family";
import type { Product } from "@/lib/ad-run";
import {
  AD_PRODUCT_CONCEPT_MAX,
  AD_PRODUCT_CONCEPT_MIN,
  AD_RUN_LIMITS,
} from "@/lib/ad-run-policy";
import { parsePublicHttpUrl } from "@/lib/public-url";

function client() {
  const key = process.env.CONTEXT_DEV_API_KEY?.trim();
  if (!key) throw new Error("CONTEXT_DEV_API_KEY is not set");
  return new ContextDev({ apiKey: key, maxRetries: 0 });
}

export function hasContextConfiguration(): boolean {
  return Boolean(process.env.CONTEXT_DEV_API_KEY?.trim());
}

export type BrandProfile = {
  domain: string;
  name: string | null;
  description: string | null;
  slogan: string | null;
  industry: string | null;
  logoUrl: string | null;
};

export type StyleguideProfile = {
  mood: string;
  colors: BrandColor[];
  fontFamily: string | null;
};

export type ProductProfile = Product;

const productExtractionSchema = z
  .object({
    products: z
      .array(
        z
          .object({
            name: z
              .string()
              .trim()
              .min(1)
              .max(AD_RUN_LIMITS.productName)
              .describe("The exact public name of a product or named service."),
            description: z
              .string()
              .trim()
              .min(1)
              .max(AD_RUN_LIMITS.productDescription)
              .describe(
                "A concise factual description of what this specific product does.",
              ),
          })
          .strict(),
      )
      .min(AD_PRODUCT_CONCEPT_MIN)
      .max(AD_PRODUCT_CONCEPT_MAX)
      .describe("Distinct flagship products or named services sold by the company."),
  })
  .strict();

// Loose shape of the SDK response (typed just enough for what we read).
type RawImage = { url?: string };
type RawBrand = {
  title?: string;
  description?: string;
  slogan?: string;
  logos?: RawImage[];
  industries?: { eic?: { industry?: string; subindustry?: string }[] };
};
type RawResponse = { brand?: RawBrand };

export async function fetchBrand(
  domain: string,
  signal?: AbortSignal,
): Promise<BrandProfile> {
  const res = (await client().brand.retrieve({ domain }, { signal })) as unknown as RawResponse;
  const brand = res.brand ?? {};

  const logos = (brand.logos ?? []).flatMap(({ url }) => {
    if (typeof url !== "string") return [];
    const normalized = parsePublicHttpUrl(url);
    return normalized ? [normalized.href] : [];
  });

  const eic = brand.industries?.eic?.[0];
  const industry = eic ? [eic.industry, eic.subindustry].filter(Boolean).join(" · ") : null;

  return {
    domain,
    name: brand.title ?? null,
    description: brand.description ?? null,
    slogan: brand.slogan ?? null,
    industry,
    logoUrl: logos[0] ?? null,
  };
}

/**
 * Homepage as markdown. Doubles as the "is this site real / reachable" check —
 * callers treat a rejection here as "couldn't reach this domain".
 */
export async function scrapePage(url: string, signal?: AbortSignal): Promise<string> {
  const res = await client().web.webScrapeMd(
    { url, useMainContentOnly: true },
    { signal },
  );
  return ((res as { markdown?: string }).markdown ?? "").slice(0, 4000);
}

type RawFontLink = { type?: unknown };
type RawTextStyle = { fontFamily?: unknown };
type RawStyleguide = {
  colors?: { accent?: unknown; background?: unknown; text?: unknown };
  fontLinks?: Record<string, RawFontLink>;
  typography?: {
    headings?: {
      h1?: RawTextStyle;
      h2?: RawTextStyle;
      h3?: RawTextStyle;
      h4?: RawTextStyle;
    };
    p?: RawTextStyle;
  };
  // Retained for compatibility with older styleguide responses.
  mood?: unknown;
  aesthetic?: unknown;
  personality?: unknown;
};

function styleguideColors(colors: RawStyleguide["colors"]): BrandColor[] {
  const roles = [
    ["Accent", colors?.accent],
    ["Background", colors?.background],
    ["Text", colors?.text],
  ] as const;
  const seen = new Set<string>();
  return roles.flatMap(([name, value]) => {
    const hex = typeof value === "string" ? normalizeBrandColorHex(value) : null;
    if (!hex || seen.has(hex)) return [];
    seen.add(hex);
    return [{ hex, name }];
  });
}

function googleFontFamily(styleguide: RawStyleguide): string | null {
  const { headings } = styleguide.typography ?? {};
  const fontLinks = styleguide.fontLinks;
  if (!fontLinks || typeof fontLinks !== "object" || Array.isArray(fontLinks)) {
    return null;
  }
  const textStyles = [
    headings?.h1,
    headings?.h2,
    headings?.h3,
    headings?.h4,
    styleguide.typography?.p,
  ];
  for (const textStyle of textStyles) {
    const family = normalizeFontFamily(textStyle?.fontFamily);
    if (
      family &&
      Object.hasOwn(fontLinks, family) &&
      fontLinks[family]?.type === "google"
    ) {
      return family;
    }
  }
  return null;
}

/** Palette and eligible typography extracted from the site's styleguide. */
export async function fetchStyleguide(
  domain: string,
  signal?: AbortSignal,
): Promise<StyleguideProfile> {
  const res = (await client().web.extractStyleguide({ domain }, { signal })) as {
    styleguide?: RawStyleguide;
  };
  const styleguide = res.styleguide ?? {};
  const mood = [styleguide.mood, styleguide.aesthetic, styleguide.personality]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");

  return {
    mood,
    colors: styleguideColors(styleguide.colors),
    fontFamily: googleFontFamily(styleguide),
  };
}

/**
 * One to three fact-grounded products sold by the Brand. Context.dev crawls the
 * site against JSON Schema generated from the Zod contract; Zod then validates
 * the untrusted response again before the planner sees it.
 */
export async function fetchProducts(
  domain: string,
  signal?: AbortSignal,
): Promise<ProductProfile[]> {
  const schema = await zodSchema(productExtractionSchema).jsonSchema;
  const res = await client().web.extract(
    {
      url: `https://${domain}`,
      schema,
      factCheck: true,
      instructions: [
        "Extract one to three distinct products or named services the company explicitly sells or offers.",
        "Prefer flagship offerings with their exact public names and factual descriptions from official product pages.",
        "Do not include the company itself, features, pricing tiers, blog posts, resources, jobs, or duplicate products.",
      ].join(" "),
      maxPages: 5,
      maxDepth: 2,
      stopAfterMs: 45_000,
    },
    { signal },
  );

  const parsed = productExtractionSchema.parse(res.data);
  const seen = new Set<string>();
  return parsed.products.filter(({ name }) => {
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
