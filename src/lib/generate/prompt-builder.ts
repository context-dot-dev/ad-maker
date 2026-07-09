import type { Brand, Copy } from "./types";
import type { FormatId } from "./presets";
import { FORMAT_SPEC } from "./presets";

/**
 * POSTER prompt (1:1 only). gpt-image-1 renders the whole thing, text included —
 * it's genuinely good at square posters. We ask it to continue the brand's
 * existing campaign rather than invent a new look.
 */
export function buildPosterPrompt(opts: {
  brand: Brand;
  copy: Copy;
  hasRefs: boolean;
  cta?: string;
}): string {
  const { brand, copy, hasRefs, cta } = opts;
  const parts: string[] = [];

  if (hasRefs) {
    parts.push(
      `The attached image is a real campaign asset from "${brand.name}" (${brand.domain}). Imagine you have just joined ${brand.name}'s design team. Create the NEXT poster that belongs in this exact campaign — someone scrolling ${brand.domain} should believe the same design team made it.`,
      `Reuse the same illustration language, spacing, color relationships, lighting, texture, typography hierarchy and compositional rhythm. Do NOT introduce new visual motifs. Do NOT simplify. Do NOT reinterpret. Continue the visual system.`,
    );
  } else {
    parts.push(
      `Create a premium square (1:1) brand poster for "${brand.name}" (${brand.domain}) that looks like it belongs on their own website.${brand.description ? ` ${brand.description}.` : ""}`,
    );
  }

  parts.push(
    `Set this copy in the brand's OWN typographic style: headline "${copy.headline}"; a small supporting line "${copy.sub}"; a small "${brand.name}" wordmark and "${brand.domain}".${cta ? ` A small plain-text label "${cta}" (NOT a button).` : ""} Perfectly spelled, real letters only, no other text.`,
    `Do NOT add generic icons, checkmarks, UI mockups, dashboards, charts, buttons, stock-photo people, watermarks, borders or frames.`,
  );

  return parts.join("\n");
}

/**
 * ARTWORK prompt (wide banners + "artwork only"). gpt-image-1 paints ONLY the
 * background — no text, no logo. When `reserveLeft` is true we ask it to keep the
 * left side calm so our renderer can lay type there with perfect kerning.
 */
export function buildArtworkPrompt(opts: {
  brand: Brand;
  format: FormatId;
  hasRefs: boolean;
  reserveLeft: boolean;
}): string {
  const { brand, format, hasRefs, reserveLeft } = opts;
  const spec = FORMAT_SPEC[format];
  const ratio = spec.aspect >= 2 ? `an ultra-wide ${Math.round(spec.aspect)}:1` : spec.aspect > 1 ? "a wide 16:9" : "a square";
  const parts: string[] = [];

  if (hasRefs) {
    parts.push(
      `The attached image is a real campaign asset from "${brand.name}" (${brand.domain}). Create the NEXT background artwork in this exact visual system — same illustration language, color relationships, lighting, texture and atmosphere. Continue the campaign; do not reinterpret or simplify it.`,
    );
  } else {
    parts.push(
      `Create premium, atmospheric background artwork for a "${brand.name}" (${brand.domain}) marketing campaign that looks like it belongs on their own website.${brand.description ? ` ${brand.description}.` : ""}`,
    );
  }

  parts.push(`Compose for ${ratio} crop.`);

  if (reserveLeft) {
    parts.push(
      `Keep the LEFT ~45% as calm, near-empty negative space (soft gradient / open area) so text can be placed there later. Concentrate all visual interest on the RIGHT side.`,
    );
  }

  parts.push(
    `Output ONLY background artwork. Absolutely NO text, letters, words, numbers, logos, wordmarks, UI, product mockups, dashboards, charts, icons, buttons, badges, watermarks, borders or frames. No people unless the reference itself uses them. Just clean, premium, on-brand atmosphere.`,
  );

  return parts.join("\n");
}
