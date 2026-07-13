import ContextDev from "context.dev";

function client() {
  const key = process.env.CONTEXT_DEV_API_KEY?.trim();
  if (!key) throw new Error("CONTEXT_DEV_API_KEY is not set");
  return new ContextDev({ apiKey: key, maxRetries: 0 });
}

export type BrandColor = { hex: string; name: string | null };
export type BrandImage = { url: string };

export type BrandAssets = {
  domain: string;
  name: string | null;
  description: string | null;
  slogan: string | null;
  industry: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  darkColor: string | null;
  colors: BrandColor[];
  logos: BrandImage[];
  backdrops: BrandImage[];
  socials: number;
  creditsConsumed: number | null;
  creditsRemaining: number | null;
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
  backdrops?: RawImage[];
  socials?: RawImage[];
  industries?: { eic?: { industry?: string; subindustry?: string }[] };
};
type RawResponse = {
  brand?: RawBrand;
  key_metadata?: { credits_consumed?: number; credits_remaining?: number };
};

function isHttp(u?: string): u is string {
  return !!u && (u.startsWith("http://") || u.startsWith("https://"));
}

function luminance(hex: string): number {
  try {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full.slice(0, 6), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  } catch {
    return 255;
  }
}

/** Pick the darkest color for the "dark" ad variant (fallback to Stripe-ish navy). */
function pickDark(hexes: string[]): string {
  if (hexes.length === 0) return "#0a2540";
  return [...hexes].sort((a, b) => luminance(a) - luminance(b))[0];
}

export async function fetchBrand(domain: string): Promise<BrandAssets> {
  const res = (await client().brand.retrieve({ domain })) as unknown as RawResponse;
  const brand = res.brand ?? {};

  const colors: BrandColor[] = (brand.colors ?? [])
    .filter((c): c is RawColor & { hex: string } => typeof c.hex === "string")
    .map((c) => ({ hex: c.hex, name: c.name ?? null }));

  const logos: BrandImage[] = (brand.logos ?? [])
    .filter((l): l is RawImage & { url: string } => isHttp(l.url))
    .map((l) => ({ url: l.url }));

  const backdrops: BrandImage[] = (brand.backdrops ?? [])
    .filter((b): b is RawImage & { url: string } => isHttp(b.url))
    .map((b) => ({ url: b.url }));

  const eic = brand.industries?.eic?.[0];
  const industry = eic ? [eic.industry, eic.subindustry].filter(Boolean).join(" · ") : null;

  return {
    domain,
    name: brand.title ?? null,
    description: brand.description ?? null,
    slogan: brand.slogan ?? null,
    industry,
    logoUrl: logos[0]?.url ?? null,
    primaryColor: colors[0]?.hex ?? null,
    darkColor: pickDark(colors.map((c) => c.hex)),
    colors,
    logos,
    backdrops,
    socials: (brand.socials ?? []).length,
    creditsConsumed: res.key_metadata?.credits_consumed ?? null,
    creditsRemaining: res.key_metadata?.credits_remaining ?? null,
  };
}

/**
 * Homepage as markdown. Doubles as the "is this site real / reachable" check —
 * callers treat a rejection here as "couldn't reach this domain".
 */
export async function scrapePage(url: string): Promise<string> {
  const res = await client().web.webScrapeMd({ url, useMainContentOnly: true });
  return ((res as { markdown?: string }).markdown ?? "").slice(0, 4000);
}

/** Visual mood from the site's styleguide; safe fallback keeps prompts working. */
export async function fetchMood(domain: string): Promise<string> {
  try {
    const res = (await client().web.extractStyleguide({ domain })) as {
      styleguide?: { mood?: string; aesthetic?: string; personality?: string };
    };
    const sg = res.styleguide as Record<string, unknown> | undefined;
    const mood = [sg?.mood, sg?.aesthetic, sg?.personality]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(", ");
    return mood || "modern, confident, premium";
  } catch {
    return "modern, confident, premium";
  }
}
