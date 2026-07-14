import {
  AD_RUN_LIMITS,
  decodeAdRunPlan,
  type AdBrief,
  type AdRunPlan,
  type PlannedConcept,
  type Six,
} from "@/lib/ad-run";
import {
  normalizeBrandColorHex,
  type BrandColor,
} from "@/lib/brand-color";
import {
  fetchBrand,
  fetchMood,
  hasContextConfiguration,
  scrapePage,
  type BrandProfile,
} from "@/lib/context";
import { normalizeDomain } from "@/lib/net";
import { parsePublicHttpUrl } from "@/lib/public-url";
import { deriveSummaryFromMarkdown, pickConceptsAndCraftCopy } from "./brief";
import { pickBrandColors } from "./colors";
import { gatewayTextModel, hasGatewayConfiguration } from "./gateway";

const DEFAULT_MOOD = "modern, confident, premium";

export type AdRunPlanningFailure =
  | { code: "invalid-domain" }
  | { code: "not-configured" }
  | { code: "aborted" }
  | { code: "domain-unreachable"; cause: unknown }
  | { code: "brand-unavailable"; cause: unknown }
  | { code: "internal"; cause: unknown };

export type AdRunPlanningResult =
  | { ok: true; value: AdRunPlan }
  | { ok: false; error: AdRunPlanningFailure };

/**
 * Behavior-level adapters used by the Ad Run planning module. External SDK
 * objects and environment-variable names stay behind this seam.
 */
export type BrandResearchAdapter = {
  isReady(): boolean;
  fetchBrand(domain: string, signal?: AbortSignal): Promise<BrandProfile>;
  scrapePage(url: string, signal?: AbortSignal): Promise<string>;
  fetchMood(domain: string, signal?: AbortSignal): Promise<string>;
};

export type ConceptPlanningAdapter = {
  isReady(): boolean;
  planConcepts(
    brief: AdBrief,
    signal?: AbortSignal,
  ): Promise<Six<PlannedConcept>>;
};

export type AdRunPlannerAdapters = {
  research: BrandResearchAdapter;
  concepts: ConceptPlanningAdapter;
};

export type AdRunPlanner = (
  rawDomain: string,
  signal?: AbortSignal,
) => Promise<AdRunPlanningResult>;

const bounded = (value: string | null | undefined, max: number): string =>
  (value ?? "").trim().slice(0, max);

function boundedColors(colors: readonly BrandColor[]): BrandColor[] {
  return colors
    .flatMap((color) => {
      const hex = normalizeBrandColorHex(color.hex);
      if (!hex) return [];
      const name = bounded(color.name, AD_RUN_LIMITS.colorName);
      return [{ hex, name: name || null }];
    })
    .slice(0, AD_RUN_LIMITS.palette);
}

function boundedLogoUrl(value: string | null): string | null {
  const candidate = (value ?? "").trim();
  if (!candidate || candidate.length > AD_RUN_LIMITS.logoUrl) return null;
  return parsePublicHttpUrl(candidate)?.href ?? null;
}

function buildBrief(
  domain: string,
  brand: BrandProfile,
  markdown: string,
  mood: string,
): AdBrief {
  const colors = boundedColors(brand.colors);
  const { a: colorA, b: colorB } = pickBrandColors(colors);
  const brandName = bounded(brand.name, AD_RUN_LIMITS.brandName) || domain;
  const description =
    bounded(brand.description, AD_RUN_LIMITS.description) ||
    bounded(brand.slogan, AD_RUN_LIMITS.description);

  return {
    domain,
    brandName,
    description,
    industry: bounded(brand.industry, AD_RUN_LIMITS.industry),
    summary: deriveSummaryFromMarkdown(markdown),
    mood: bounded(mood, AD_RUN_LIMITS.mood) || DEFAULT_MOOD,
    colorA: bounded(colorA, AD_RUN_LIMITS.promptColor),
    colorB: bounded(colorB, AD_RUN_LIMITS.promptColor),
    logoUrl: boundedLogoUrl(brand.logoUrl),
    colors,
  };
}

/**
 * Domain -> Brief -> six Planned Concepts. The returned function is the whole
 * test surface; partial-failure policy and contract validation stay local.
 */
export function createAdRunPlanner(adapters: AdRunPlannerAdapters): AdRunPlanner {
  return async (rawDomain, signal) => {
    const domain = normalizeDomain(rawDomain);
    if (!domain) return { ok: false, error: { code: "invalid-domain" } };
    if (signal?.aborted) return { ok: false, error: { code: "aborted" } };

    try {
      // Evaluate both checks before starting work: a planned Ad Run is useless
      // unless both enrichment and generation are configured.
      const contextReady = adapters.research.isReady();
      const generationReady = adapters.concepts.isReady();
      if (!contextReady || !generationReady) {
        return { ok: false, error: { code: "not-configured" } };
      }

      const [brandResult, pageResult, moodResult] = await Promise.allSettled([
        adapters.research.fetchBrand(domain, signal),
        adapters.research.scrapePage(`https://${domain}`, signal),
        adapters.research.fetchMood(domain, signal),
      ]);

      if (signal?.aborted) return { ok: false, error: { code: "aborted" } };

      if (brandResult.status === "rejected" && pageResult.status === "rejected") {
        return {
          ok: false,
          error: { code: "domain-unreachable", cause: brandResult.reason },
        };
      }
      if (brandResult.status === "rejected") {
        return {
          ok: false,
          error: { code: "brand-unavailable", cause: brandResult.reason },
        };
      }

      const brief = buildBrief(
        domain,
        brandResult.value,
        pageResult.status === "fulfilled" ? pageResult.value : "",
        moodResult.status === "fulfilled" ? moodResult.value : DEFAULT_MOOD,
      );
      const concepts = await adapters.concepts.planConcepts(brief, signal);
      if (signal?.aborted) return { ok: false, error: { code: "aborted" } };

      return {
        ok: true,
        value: decodeAdRunPlan({ brief, concepts }),
      };
    } catch (cause) {
      if (signal?.aborted) return { ok: false, error: { code: "aborted" } };
      return { ok: false, error: { code: "internal", cause } };
    }
  };
}

const productionPlanner = createAdRunPlanner({
  research: {
    isReady: hasContextConfiguration,
    fetchBrand,
    scrapePage,
    fetchMood,
  },
  concepts: {
    isReady: hasGatewayConfiguration,
    planConcepts: (brief, signal) =>
      pickConceptsAndCraftCopy(
        gatewayTextModel("openai/gpt-5.4-mini"),
        brief,
        signal,
      ),
  },
});

/** Production adapter used by the Brief HTTP route. */
export const planAdRun: AdRunPlanner = (rawDomain, signal) =>
  productionPlanner(rawDomain, signal);
