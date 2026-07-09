import type { Brand, Copy } from "./types";
import type { FormatId } from "./presets";
import { FORMAT_SPEC } from "./presets";

/**
 * POSTER prompt — gpt-image-1 renders the WHOLE ad, text included. It's great at
 * this for 1:1. For wide banners the trick is the fixed output size: the model can
 * only paint 1536x1024, which we then crop to (e.g.) 3:1. So we make the prompt
 * CROP-AWARE — force every word into the horizontal safe band that survives the
 * crop, and pad the top/bottom with plain background we can throw away. That's
 * what stops the "stretched, mis-aligned" banner text.
 */
export function buildPosterPrompt(opts: {
  brand: Brand;
  copy: Copy;
  format: FormatId;
  hasRefs: boolean;
  cta?: string;
}): string {
  const { brand, copy, format, hasRefs, cta } = opts;
  const spec = FORMAT_SPEC[format];
  const parts: string[] = [];

  // shape + how the final crop works
  if (spec.aspect >= 2.5) {
    parts.push(
      `Design a complete, ultra-wide ${Math.round(spec.aspect)}:1 marketing banner for "${brand.name}" (${brand.domain}).`,
      `CRITICAL CROP RULE: the square-ish image you produce will be cropped to a thin horizontal ${Math.round(spec.aspect)}:1 letterbox taken from the VERTICAL CENTER. Therefore place the ENTIRE design — headline, supporting line, wordmark, and all key visuals — inside the horizontal center band (roughly the middle 42% of the height). Fill the top ~30% and bottom ~30% with nothing but a plain, continuous extension of the same background/color so it can be cropped away with zero loss.`,
    );
  } else if (spec.aspect > 1.2) {
    parts.push(
      `Design a complete 16:9 landscape ad for "${brand.name}" (${brand.domain}).`,
      `The image will be cropped slightly to 16:9 from the center — keep all text and key elements within the central area with comfortable top/bottom margins.`,
    );
  } else {
    parts.push(
      `Design a complete premium square (1:1) brand poster for "${brand.name}" (${brand.domain}).`,
    );
  }
  if (brand.description) parts.push(`${brand.description}.`);

  if (hasRefs) {
    parts.push(
      `The attached image is a real campaign asset from ${brand.name}. Match it exactly — same illustration language, color relationships, lighting, texture and typographic feel. Continue the campaign; do not reinterpret or simplify it.`,
    );
  }

  // ── STRICT TYPOGRAPHY SPEC ─────────────────────────────────────────────────
  // The single most important part. gpt-image-1 will happily produce warped,
  // misspelled, double-printed text unless it is told, forcefully and in detail,
  // exactly how a real designer sets type. So we do.
  parts.push(
    `TEXT IS THE #1 PRIORITY. The typography must look like it was set by a professional designer in a tool like Figma — clean, sharp, and flawless. Follow these rules exactly:`,
    `• Render EXACTLY this text and NOTHING else:`,
    `   HEADLINE (largest, bold): "${copy.headline}"`,
    copy.sub ? `   SUBHEADLINE (about 40% of the headline size, regular weight): "${copy.sub}"` : "",
    `   WORDMARK (small): "${brand.name}"   plus the URL "${brand.domain}"`,
    cta ? `   CTA (small pill or plain label): "${cta}"` : "",
    `• Spelling must be 100% correct, letter for letter. Do NOT invent, add, translate, repeat, or drop any words. No lorem ipsus, no random extra text anywhere in the image.`,
    `• Use ONE clean, modern geometric sans-serif typeface (Inter / Geist / Helvetica style) for everything. Consistent, even letterforms — every "a", "e", "s" identical.`,
    `• Left-align all text on a single shared left margin. Tight, professional kerning; comfortable line-height (~1.15); no letter overlaps, no touching characters, no squished or stretched glyphs, no warping, no faux-3D, no drop shadows, no outlines.`,
    `• Strong contrast: place text over the calmest part of the background; if needed darken/lighten that area slightly so every character is perfectly legible. High legibility beats decoration.`,
    `• Clear hierarchy and breathing room: headline on 1–2 lines, generous padding around the text block, plenty of negative space. Do not crowd the frame.`,
    `• Keep the headline short on each line — never hyphenate or break a word across lines.`,
    `The final text must be crisp enough to screenshot and ship. If any letter would look wrong, make it simpler and cleaner instead.`,
    `Do NOT add generic UI mockups, dashboards, charts, icons, checkmarks, buttons, stock-photo people, watermarks, borders, frames, or any decorative gibberish text.`,
  );

  return parts.filter(Boolean).join("\n");
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
      `Create a natural composition with one dominant focal region and generous, organic negative space where a headline could sit comfortably later. The empty area must feel like an intentional part of the composition — do NOT create an obvious blank rectangle or split the frame into "empty half / busy half". Keep it balanced, editorial and premium.`,
    );
  }

  parts.push(
    `Output ONLY background artwork. Absolutely NO text, letters, words, numbers, logos, wordmarks, UI, product mockups, dashboards, charts, icons, buttons, badges, watermarks, borders or frames. No people unless the reference itself uses them. Just clean, premium, on-brand atmosphere.`,
  );

  return parts.join("\n");
}
