import { FORMAT_SPEC } from "./presets";
import type { Brand, Copy } from "./types";
import type { FormatId } from "./presets";

/**
 * "Continue the campaign" prompt. When a real reference is attached we ask the
 * model to EXTEND the existing visual system — not reinterpret it. We give it
 * almost no creative choices; the reference answers them.
 */
export function buildPosterPrompt(opts: {
  brand: Brand;
  copy: Copy;
  format: FormatId;
  hasRefs: boolean;
  textFree: boolean;
  cta?: string;
}): string {
  const { brand, copy, format, hasRefs, textFree, cta } = opts;
  const spec = FORMAT_SPEC[format];
  const parts: string[] = [];

  if (hasRefs) {
    parts.push(
      `The attached image is a real campaign asset from "${brand.name}" (${brand.domain}). Imagine you have just joined ${brand.name}'s design team. Create the NEXT poster that belongs in this exact campaign — someone scrolling ${brand.domain} should believe the same design team made it.`,
    );
    parts.push(
      `Reuse the same illustration language, spacing, color relationships, lighting, texture, typography hierarchy and compositional rhythm. Do NOT introduce new visual motifs. Do NOT simplify. Do NOT reinterpret. Continue the visual system.`,
    );
  } else {
    parts.push(
      `Create a premium brand poster for "${brand.name}" (${brand.domain}) that looks like it belongs on their own website.${brand.description ? ` ${brand.description}.` : ""}`,
    );
  }

  parts.push(`Crop intent: ${spec.crop}.`);

  if (textFree) {
    parts.push(
      `Output ONLY the artwork — no words, no headline, no logo text, no UI, no product mockups, no icons, no charts, no people (unless the reference itself uses people). Pure campaign artwork that could be a desktop wallpaper.`,
    );
  } else {
    parts.push(
      `Set this copy in the brand's OWN typographic style, matching the reference's type hierarchy exactly: headline "${copy.headline}"; a small supporting line "${copy.sub}"; a small "${brand.name}" wordmark and "${brand.domain}".${cta ? ` A small plain-text label "${cta}" (NOT a button).` : ""} Perfectly spelled, real letters only, no other text.`,
    );
    parts.push(
      `Do NOT add generic icons, checkmarks, UI mockups, dashboards, charts, buttons, stock-photo people, watermarks, borders or frames.`,
    );
  }

  return parts.join("\n");
}
