import ContextDev from "context.dev";

function apiKey(): string {
  const key = process.env.CONTEXT_DEV_API_KEY?.trim();
  if (!key) throw new Error("CONTEXT_DEV_API_KEY is not set");
  return key;
}

function client() {
  return new ContextDev({ apiKey: apiKey(), maxRetries: 0 });
}

export type BrandAssets = {
  domain: string;
  name: string | null;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  colors: string[];
};

export async function fetchBrand(domain: string): Promise<BrandAssets> {
  const res = await client().brand.retrieve({ domain, maxAgeMs: 0 });
  const brand = res.brand;

  const logos: { url?: string; type?: string }[] = (brand as { logos?: { url?: string; type?: string }[] }).logos ?? [];
  const logoUrl =
    logos.find((l) => l.type === "icon" || l.type === "logo")?.url ??
    logos[0]?.url ??
    null;

  const rawColors: { hex?: string }[] = (brand as { colors?: { hex?: string }[] }).colors ?? [];
  const colors = rawColors.map((c) => c.hex ?? "").filter(Boolean);

  return {
    domain,
    name: (brand as { name?: string }).name ?? null,
    description: (brand as { description?: string }).description ?? null,
    logoUrl: logoUrl && (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) ? logoUrl : null,
    primaryColor: colors[0] ?? null,
    colors,
  };
}

export async function scrapePage(url: string): Promise<string> {
  const res = await client().web.webScrapeMd({
    url,
    useMainContentOnly: true,
    maxAgeMs: 0,
  });
  return ((res as { markdown?: string }).markdown ?? "").slice(0, 4000);
}
