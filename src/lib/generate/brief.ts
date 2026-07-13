import { generateObject } from "ai";
import { z } from "zod";
import type { AIProvider } from "./provider";
import { ALL_AD_CONCEPTS, AD_MODELS_PRIMARY, AD_MODELS_SECONDARY, ADS_PER_RUN, CONCEPT_KEYS, type ConceptKey } from "./concepts";

/** Everything a concept prompt needs, derived once per domain. */
export type AdBrief = {
  domain: string;
  brandName: string;
  description: string;
  industry: string;
  summary: string;
  mood: string;
  colorA: string;
  colorB: string;
  logoUrl: string | null;
  colors: { hex: string; name: string | null }[];
};

export type PlannedConcept = {
  key: ConceptKey;
  label: string;
  model: string;
  headline: string;
  subheadline: string;
};

const clampWords = (s: string, max: number) =>
  s.trim().split(/\s+/).filter(Boolean).slice(0, max).join(" ");

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Scrub scraped homepage markdown down to 1–2 plain sentences: what do they sell? */
export function deriveSummaryFromMarkdown(md: string): string {
  const lines = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith("#")) // headings
    .filter((l) => !/^[!\[\]>|`-]/.test(l)) // images, links-only, quotes, tables, rules
    .map((l) => l.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, ""))
    .filter((l) => !/^(sign up|log ?in|get started|try|book a demo|learn more|contact)/i.test(l))
    .filter((l) => !/\d+%|\d+x|\$\d/.test(l)); // stats lines

  const text = lines.join(" ");
  const sentences = (text.match(/[^.!?]{20,240}[.!?]/g) ?? [])
    .map((s) => s.trim())
    // Drop fragments produced by joined nav/hero lines — keep well-formed sentences.
    .filter((s) => /^[A-Z0-9"'‘“]/.test(s));
  return sentences.slice(0, 2).join(" ").trim().slice(0, 480);
}

/**
 * One LLM call: pick 6 of the 12 concepts that fit the brand AND feel visually
 * varied, and write a tailored headline/subheadline for each. Falls back to a
 * random six with slogan-derived copy when the call fails.
 */
export async function pickConceptsAndCraftCopy(
  provider: AIProvider | null,
  brief: AdBrief,
): Promise<PlannedConcept[]> {
  let picks: { key: ConceptKey; headline: string; subheadline: string }[] = [];

  if (provider) {
    try {
      const { object } = await generateObject({
        model: provider.text("openai/gpt-5.4-mini"),
        schema: z.object({
          picks: z
            .array(
              z.object({
                concept: z.enum(CONCEPT_KEYS),
                headline: z.string().describe("max 3 words, confident, poster-like, brand voice"),
                subheadline: z.string().describe("one supporting line, max 12 words"),
              }),
            )
            .min(ADS_PER_RUN)
            .max(ADS_PER_RUN),
        }),
        system: [
          "You are a world-class creative director choosing ad directions for a brand.",
          "Pick exactly 6 DISTINCT concepts that fit this brand and feel visually varied from each other — never six moody abstractions in a row.",
          "For each pick write a tailored headline (max 3 words) and subheadline (max 12 words) in a tone matching that concept's style.",
          "Copy must be defensible from the brand info provided — never invent product categories the company doesn't serve.",
        ].join(" "),
        prompt: [
          `BRAND: ${brief.brandName} (${brief.domain})`,
          brief.industry ? `INDUSTRY: ${brief.industry}` : "",
          brief.description ? `DESCRIPTION: ${brief.description}` : "",
          brief.summary ? `WHAT THEY SELL (from their homepage): ${brief.summary}` : "",
          `VISUAL MOOD: ${brief.mood}`,
          "",
          "CONCEPT CATALOG:",
          ...ALL_AD_CONCEPTS.map((c) => `- ${c.key} (${c.label}) — best for: ${c.bestFor}`),
        ]
          .filter(Boolean)
          .join("\n"),
        temperature: 0.8,
      });

      const seen = new Set<ConceptKey>();
      for (const p of object.picks) {
        if (seen.has(p.concept)) continue;
        seen.add(p.concept);
        picks.push({
          key: p.concept,
          headline: clampWords(p.headline, 3),
          subheadline: clampWords(p.subheadline, 12),
        });
      }
    } catch (err) {
      console.warn("[brief] concept picking failed, using fallback:", (err as Error)?.message);
      picks = [];
    }
  }

  // Pad (or fully fall back) with random unused concepts + slogan-derived copy.
  if (picks.length < ADS_PER_RUN) {
    const used = new Set(picks.map((p) => p.key));
    const headline = clampWords(brief.brandName, 3) || "Meet the brand";
    const subheadline = clampWords(brief.description || brief.summary || `Discover ${brief.domain}`, 12);
    for (const c of shuffle(ALL_AD_CONCEPTS)) {
      if (picks.length >= ADS_PER_RUN) break;
      if (used.has(c.key)) continue;
      picks.push({ key: c.key, headline, subheadline });
    }
  }

  // One model per pick, every ad by a different model. The primary trio
  // always lands in the first three slots (shuffled among themselves).
  const models = [...shuffle(AD_MODELS_PRIMARY), ...shuffle(AD_MODELS_SECONDARY)];
  return picks.slice(0, ADS_PER_RUN).map((p, i) => {
    const concept = ALL_AD_CONCEPTS.find((c) => c.key === p.key)!;
    return {
      key: p.key,
      label: concept.label,
      model: models[i % models.length],
      headline: p.headline,
      subheadline: p.subheadline,
    };
  });
}
