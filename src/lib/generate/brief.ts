import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { AD_RUN_LIMITS } from "../ad-run-policy";
import {
  AD_RUN_SIZE,
  type AdBrief,
  type PlannedConcept,
  type Six,
} from "../ad-run";
import {
  CREATIVE_DIRECTIONS,
  CREATIVE_DIRECTION_KEYS,
  type CreativeDirectionKey,
} from "./directions";
import { assignImageModels } from "./models";

export type { AdBrief, PlannedConcept } from "../ad-run";

const clampWords = (s: string, max: number) =>
  s.trim().split(/\s+/).filter(Boolean).slice(0, max).join(" ");

const limitCopy = (value: string, words: number, characters: number) =>
  clampWords(value, words).slice(0, characters).trim();

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
    .filter(
      (l) =>
        !/^(sign up|log ?in|get started|try|book a demo|learn more|contact)/i.test(
          l,
        ),
    )
    .filter((l) => !/\d+%|\d+x|\$\d/.test(l)); // stats lines

  const text = lines.join(" ");
  const sentences = (text.match(/[^.!?]{20,240}[.!?]/g) ?? [])
    .map((s) => s.trim())
    // Drop fragments produced by joined nav/hero lines — keep well-formed sentences.
    .filter((s) => /^[A-Z0-9"'‘“]/.test(s));
  return sentences
    .slice(0, 2)
    .join(" ")
    .trim()
    .slice(0, AD_RUN_LIMITS.summary);
}

/**
 * One LLM call: pick 6 of the 12 concepts that fit the brand AND feel visually
 * varied, and write a tailored headline/subheadline for each. Falls back to a
 * random six with slogan-derived copy when the call fails.
 */
export async function pickConceptsAndCraftCopy(
  model: LanguageModel,
  brief: AdBrief,
  signal?: AbortSignal,
): Promise<Six<PlannedConcept>> {
  let picks: {
    key: CreativeDirectionKey;
    headline: string;
    subheadline: string;
  }[] = [];

  try {
    const { object } = await generateObject({
      model,
      schema: z.object({
        picks: z
          .array(
            z.object({
              concept: z.enum(CREATIVE_DIRECTION_KEYS),
              headline: z
                .string()
                .describe(
                  `max ${AD_RUN_LIMITS.headlineWords} words, confident, poster-like, brand voice`,
                ),
              subheadline: z
                .string()
                .describe(
                  `one supporting line, max ${AD_RUN_LIMITS.subheadlineWords} words`,
                ),
            }),
          )
          .length(AD_RUN_SIZE),
      }),
      system: [
        "You are a world-class creative director choosing ad directions for a brand.",
        `Pick exactly ${AD_RUN_SIZE} DISTINCT concepts that fit this brand and feel visually varied from each other — never fill the whole Ad Run with moody abstractions.`,
        `For each pick write a tailored headline (max ${AD_RUN_LIMITS.headlineWords} words) and subheadline (max ${AD_RUN_LIMITS.subheadlineWords} words) in a tone matching that concept's style.`,
        "Copy must be defensible from the brand info provided — never invent product categories the company doesn't serve.",
      ].join(" "),
      prompt: [
        `BRAND: ${brief.brandName} (${brief.domain})`,
        brief.industry ? `INDUSTRY: ${brief.industry}` : "",
        brief.description ? `DESCRIPTION: ${brief.description}` : "",
        brief.summary
          ? `WHAT THEY SELL (from their homepage): ${brief.summary}`
          : "",
        `VISUAL MOOD: ${brief.mood}`,
        "",
        "CONCEPT CATALOG:",
        ...CREATIVE_DIRECTIONS.map(
          (c) => `- ${c.key} (${c.label}) — best for: ${c.bestFor}`,
        ),
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.8,
      abortSignal: signal,
    });

    const seen = new Set<CreativeDirectionKey>();
    for (const p of object.picks) {
      if (seen.has(p.concept)) continue;
      const headline = limitCopy(
        p.headline,
        AD_RUN_LIMITS.headlineWords,
        AD_RUN_LIMITS.headline,
      );
      if (!headline) continue;
      seen.add(p.concept);
      picks.push({
        key: p.concept,
        headline,
        subheadline: limitCopy(
          p.subheadline,
          AD_RUN_LIMITS.subheadlineWords,
          AD_RUN_LIMITS.subheadline,
        ),
      });
    }
  } catch (err) {
    console.warn(
      "[brief] concept picking failed, using fallback:",
      (err as Error)?.message,
    );
    picks = [];
  }

  // Pad (or fully fall back) with random unused concepts + slogan-derived copy.
  if (picks.length < AD_RUN_SIZE) {
    const used = new Set(picks.map((p) => p.key));
    const headline =
      limitCopy(
        brief.brandName,
        AD_RUN_LIMITS.headlineWords,
        AD_RUN_LIMITS.headline,
      ) || "Meet the brand";
    const subheadline = limitCopy(
      brief.description || brief.summary || `Discover ${brief.domain}`,
      AD_RUN_LIMITS.subheadlineWords,
      AD_RUN_LIMITS.subheadline,
    );
    for (const c of shuffle(CREATIVE_DIRECTIONS)) {
      if (picks.length >= AD_RUN_SIZE) break;
      if (used.has(c.key)) continue;
      picks.push({ key: c.key, headline, subheadline });
    }
  }

  // One model per pick, every ad by a different model. The primary trio
  // always lands in the first three slots (shuffled among themselves).
  const models = assignImageModels();
  const planned = picks.slice(0, AD_RUN_SIZE).map((p, i) => {
    return {
      key: p.key,
      model: models[i],
      headline: p.headline,
      subheadline: p.subheadline,
    };
  });

  if (planned.length !== AD_RUN_SIZE) {
    throw new Error(
      `Ad Run planning produced ${planned.length} concepts; expected ${AD_RUN_SIZE}`,
    );
  }
  return [
    planned[0],
    planned[1],
    planned[2],
    planned[3],
    planned[4],
    planned[5],
  ];
}
