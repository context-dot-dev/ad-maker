import { NextResponse } from "next/server";
import { briefHref } from "@/lib/ad-run";
import {
  planAdRun,
  type AdRunPlanningFailure,
} from "@/lib/generate/planner";
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
const NO_STORE = { "Cache-Control": "no-store", "CDN-Cache-Control": "no-store" };

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: NO_STORE });

function failureResponse(failure: AdRunPlanningFailure) {
  switch (failure.code) {
    case "invalid-domain":
      return fail("Please enter a valid domain, e.g. stripe.com", 400);
    case "not-configured":
      return fail("Ad generation is temporarily unavailable. Please try again later.", 503);
    case "aborted":
      return fail("The request was cancelled.", 499);
    case "domain-unreachable":
      return fail("We couldn't find or reach this domain. Double-check the URL and try again.", 502);
    case "brand-unavailable":
      return fail("Couldn't load brand data for that domain. Try another one.", 502);
    case "internal":
      console.error("[brief] Ad Run planning failed:", failure.cause);
      return fail("We couldn't prepare this ad run. Please try again.", 500);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (
    [...new Set(url.searchParams.keys())].some((key) => key !== "domain") ||
    url.searchParams.getAll("domain").length !== 1
  ) {
    return fail("Invalid brief request.", 400);
  }

  const domain = normalizeDomain(url.searchParams.get("domain") ?? "");
  if (!domain) return failureResponse({ code: "invalid-domain" });

  const canonicalHref = briefHref(domain);
  if (`${url.pathname}${url.search}` !== canonicalHref) {
    return NextResponse.redirect(new URL(canonicalHref, url), {
      status: 308,
      headers: NO_STORE,
    });
  }

  const result = await planAdRun(domain, req.signal);
  if (!result.ok) return failureResponse(result.error);

  return NextResponse.json(
    result.value,
    { headers: { "Cache-Control": CACHE_OK, "CDN-Cache-Control": CACHE_OK } },
  );
}
