import ContextDev from "context.dev";
import {
  normalizeBrandColorHex,
  type BrandColor,
} from "@/lib/brand-color";
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
  colors: BrandColor[];
};

// Loose shape of the SDK response (typed just enough for what we read).
type RawColor = { hex?: string; name?: string };
type RawImage = { url?: string };
type RawBrand = {
  title?: string;
  description?: string;
  slogan?: string;
  colors?: RawColor[];
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

  const colors: BrandColor[] = (brand.colors ?? []).flatMap((color) => {
    const hex = typeof color.hex === "string" ? normalizeBrandColorHex(color.hex) : null;
    return hex ? [{ hex, name: color.name ?? null }] : [];
  });

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
    colors,
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

/** Visual mood from the site's styleguide; the planner owns fallback policy. */
export async function fetchMood(domain: string, signal?: AbortSignal): Promise<string> {
  const res = (await client().web.extractStyleguide({ domain }, { signal })) as {
    styleguide?: { mood?: string; aesthetic?: string; personality?: string };
  };
  const sg = res.styleguide as Record<string, unknown> | undefined;
  return [sg?.mood, sg?.aesthetic, sg?.personality]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");
}
