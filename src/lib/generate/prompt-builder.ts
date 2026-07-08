import { DESIGN_SYSTEMS, COMPOSITION_ARCHETYPES, FORMAT_SPEC } from "./presets";
import type { Brand, CreativeDirection, VisualConcept, Copy } from "./types";
import type { FormatId } from "./presets";

/**
 * Poster-first prompt. The hero visual leads; typography supports. No layout
 * grid, no CTA button, no icons — the point is a memorable, shareable image.
 */
export function buildImagePrompt(opts: {
  brand: Brand;
  creative: CreativeDirection;
  concept: VisualConcept;
  copy: Copy;
  angle: string;
  format: FormatId;
  cta?: string;
}): string {
  const { brand, creative, concept, copy, angle, format, cta } = opts;
  const ds = DESIGN_SYSTEMS[creative.designLanguage];
  const spec = FORMAT_SPEC[format];
  const comp = COMPOSITION_ARCHETYPES[concept.composition];

  const palette = brand.colors.length
    ? brand.colors.map((c, i) => (brand.colorNames[i] ? `${c} (${brand.colorNames[i]})` : c)).join(", ")
    : "the brand palette";

  return [
    `A premium BRAND POSTER for "${brand.name}" — a striking, shareable image, NOT a templated ad. Crop intent: ${spec.crop}.`,
    `Design language: ${ds.label} — ${ds.look}.`,
    `Campaign: ${creative.campaignConcept}. This piece: ${angle}. Mood: ${creative.mood}.`,
    ``,
    `THE HERO (this is the star, it dominates the image): ${concept.heroObject}, ${concept.scale}. Focal point: ${concept.focalPoint}.`,
    `Composition: ${comp} — intentionally UNBALANCED with ${concept.emptySpace} empty space. Do NOT center everything into a tidy template.`,
    `Atmosphere: ${concept.atmosphere}. Lighting: ${concept.lighting}. Texture: ${concept.texture}. Background: ${creative.backgroundApproach} — ${ds.texture}. The image must have real depth and mood, never flat or empty.`,
    `Color: use ONLY ${palette}. ${creative.paletteUsage}. Maximum 3 colors.`,
    ``,
    `Typography SUPPORTS the visual (it must never look like a slide): headline "${copy.headline}" in ${concept.typographyWeight} weight; a small supporting line "${copy.sub}"; a small "${brand.name}" wordmark and "${brand.domain}".${cta ? ` A small text label "${cta}" (as plain text, NOT a button).` : ""} Perfectly spelled, real letters only, no extra text.`,
    ``,
    `WALLPAPER TEST: the composition must still look beautiful with ALL text removed.`,
    `Strictly DO NOT include: icons, checkmarks, globes-as-clipart, node/network diagrams, laptops, phones, monitors, UI mockups, dashboards, charts, buttons, stock-photo people, clip-art, watermarks, borders or frames, or a symmetric centered template. No misspelled or repeated letters.`,
    creative.avoid.length ? `Also avoid: ${creative.avoid.join(", ")}.` : "",
  ].filter(Boolean).join("\n");
}
