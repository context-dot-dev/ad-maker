import { generateObject } from "ai";
import type { OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";
import { MOTIFS, COMPOSITION_ARCHETYPES } from "./presets";
import type { Brand, CreativeDirection, VisualConcept } from "./types";

const compKeys = Object.keys(COMPOSITION_ARCHETYPES) as [string, ...string[]];
const compDescribe = Object.entries(COMPOSITION_ARCHETYPES).map(([k, v]) => `- ${k}: ${v}`).join("\n");

/**
 * STEP 2 — the visual idea. For each angle it invents a POSTER concept: one
 * dominant hero object (exaggerated from the brand's motif set), an unbalanced
 * composition, plus texture, lighting, atmosphere and focal point. This is what
 * makes the output memorable instead of "AI-safe".
 */
export async function artDirector(openai: OpenAIProvider, brand: Brand, creative: CreativeDirection): Promise<VisualConcept[]> {
  const motifs = MOTIFS[creative.designLanguage];

  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      concepts: z.array(z.object({
        heroObject: z.string().describe("the ONE dominant visual, exaggerated into a poster piece — a real sculptural object/scene, never an icon"),
        composition: z.enum(compKeys),
        scale: z.string().describe("how much of the canvas the hero fills, e.g. 'occupies ~70% of the frame'"),
        texture: z.string().describe("surface + background texture that gives depth (grain, gloss, paper fiber, mesh, bloom)"),
        lighting: z.string().describe("light direction & quality, e.g. 'soft top-left daylight'"),
        atmosphere: z.string().describe("the feeling/mood of the scene"),
        typographyWeight: z.string().describe("e.g. 'very heavy', 'light and airy'"),
        emptySpace: z.enum(["medium", "high", "very high"]),
        focalPoint: z.string().describe("the single thing the eye lands on first"),
      })).min(creative.angles.length).max(creative.angles.length),
    }),
    system:
      "You are a world-class art director. You design PREMIUM BRAND POSTERS, the kind people set as desktop wallpaper and share on X. " +
      "The artwork is the hero; typography only supports it. Never use icons, checkmarks, node/network diagrams, laptops, phones, dashboards or UI. " +
      "Prefer bold, UNBALANCED compositions with generous empty space and real atmosphere/texture. The wallpaper test: it must look striking even with all text removed.",
    prompt: [
      `BRAND: ${brand.name} — ${creative.designLanguage} design language.`,
      `CAMPAIGN: ${creative.campaignConcept}. Mood: ${creative.mood}.`,
      `Background atmosphere: ${creative.backgroundApproach}.`,
      "",
      "Choose and EXAGGERATE one of these brand-appropriate motifs per concept (adapt freely, make it a real poster hero, not clip-art):",
      ...motifs.map((m) => `- ${m}`),
      "",
      "COMPOSITION ARCHETYPES (pick one per concept, keep it unbalanced):",
      compDescribe,
      "",
      creative.avoid.length ? `Avoid: ${creative.avoid.join(", ")}.` : "",
      `Design ${creative.angles.length} concept(s), one per angle below:`,
      ...creative.angles.map((a, i) => `${i + 1}. ${a}`),
    ].filter(Boolean).join("\n"),
    temperature: 0.9,
  });

  return object.concepts as VisualConcept[];
}
