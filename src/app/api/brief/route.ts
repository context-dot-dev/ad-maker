import { NextResponse } from "next/server";
import { fetchBrand, fetchMood, scrapePage } from "@/lib/context";
import { getProvider } from "@/lib/generate/provider";
import { pickBrandColors } from "@/lib/generate/colors";
import { deriveSummaryFromMarkdown, pickConceptsAndCraftCopy, type AdBrief } from "@/lib/generate/brief";
import { normalizeDomain } from "@/lib/net";

export const maxDuration = 120;

/**
 * GET /api/brief?domain=stripe.com
 *
 * The single entry point: pulls brand data, homepage, and visual mood from
 * Context.dev, then one LLM call picks 6 of the 12 concepts and writes copy.
 * GET + Cache-Control so identical domains are served straight from the
 * Vercel CDN instead of re-burning API credits.
 */
const CACHE_OK = "public, s-maxage=3600, stale-while-revalidate=86400";

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("domain") ?? "";
  const domain = normalizeDomain(raw);
  if (!domain) return fail("Please enter a valid domain, e.g. stripe.com", 400);

  const [brandResult, pageResult, moodResult] = await Promise.allSettled([
    fetchBrand(domain),
    scrapePage(`https://${domain}`),
    fetchMood(domain),
  ]);

  // The homepage scrape doubles as the reachability check.
  if (pageResult.status === "rejected" && brandResult.status === "rejected") {
    return fail("We couldn't find or reach this domain. Double-check the URL and try again.", 502);
  }
  if (brandResult.status === "rejected") {
    return fail("Couldn't load brand data for that domain. Try another one.", 502);
  }

  const brand = brandResult.value;
  const markdown = pageResult.status === "fulfilled" ? pageResult.value : "";
  const { a: colorA, b: colorB } = pickBrandColors(brand.colors);

  const brief: AdBrief = {
    domain,
    brandName: brand.name ?? domain,
    description: brand.description ?? brand.slogan ?? "",
    industry: brand.industry ?? "",
    summary: deriveSummaryFromMarkdown(markdown),
    mood: moodResult.status === "fulfilled" ? moodResult.value : "modern, confident, premium",
    colorA,
    colorB,
    logoUrl: brand.logoUrl,
    colors: brand.colors.slice(0, 8),
  };

  const concepts = await pickConceptsAndCraftCopy(getProvider(), brief);

  return NextResponse.json(
    { brief, concepts },
    { headers: { "Cache-Control": CACHE_OK, "CDN-Cache-Control": CACHE_OK } },
  );
}
