/**
 * The 12 creative directions. Every run picks 6 and renders one square ad per
 * pick. Each concept owns a hand-written prompt template; all of them share the
 * same strict typography spec and hard rules.
 */

export type PromptInput = {
  brandName: string;
  domain: string;
  /** One or two plain sentences describing what the brand actually sells. */
  summary: string;
  industry: string;
  /** Visual mood pulled from the site's styleguide, e.g. "modern, confident, premium". */
  mood: string;
  /** Brand colors as plain-English phrases (never hex — models print hex codes into the art). */
  colorA: string;
  colorB: string;
  headline: string;
  subheadline: string;
};

export type ConceptKey =
  | "product_hero"
  | "isometric"
  | "typographic"
  | "macro_material"
  | "gradient_field"
  | "editorial_spread"
  | "sculptural_object"
  | "data_viz"
  | "blueprint"
  | "retro_arcade"
  | "monochrome_crop"
  | "collage";

export type AdConcept = {
  key: ConceptKey;
  label: string;
  /** Shown to the concept-picking LLM so it can match directions to the brand. */
  bestFor: string;
  buildPrompt: (p: PromptInput) => string;
};

/**
 * Six image models, one per ad, every ad by a DIFFERENT model. The primary
 * trio always takes the first three slots (shuffled among themselves); the
 * secondary trio fills the rest. THIS IS THE SWAP POINT — edit these lists
 * to change models.
 */
export const AD_MODELS_PRIMARY = [
  "openai/gpt-image-1",
  "openai/gpt-image-2",
  "xai/grok-imagine-image",
] as const;

export const AD_MODELS_SECONDARY = [
  "google/imagen-4.0-generate-001",
  "bfl/flux-2-pro",
  "recraft/recraft-v4.1",
] as const;

export const AD_MODELS: readonly string[] = [...AD_MODELS_PRIMARY, ...AD_MODELS_SECONDARY];

/**
 * Models that accept an image input (we attach the brand's real logo so the
 * mark is reproduced exactly). The rest go text-only — sending them an image
 * routes to an edit endpoint they don't have and the whole render fails.
 */
export const IMAGE_INPUT_MODELS = new Set<string>([
  "openai/gpt-image-1",
  "openai/gpt-image-2",
  "xai/grok-imagine-image",
  "bfl/flux-2-pro",
]);

export const ADS_PER_RUN = 6;

function typography(p: PromptInput, opts?: { includeUrl?: boolean }): string {
  return [
    `TEXT IS THE #1 PRIORITY. The typography must look like it was set by a professional designer in Figma — clean, sharp, flawless. Follow these rules exactly:`,
    `• The image must contain EXACTLY these pieces of text, and absolutely nothing else — no labels, no numbering, no extra words:`,
    `   "${p.headline}" — set largest, bold (this is the headline)`,
    p.subheadline ? `   "${p.subheadline}" — set at about 40% of the headline size, regular weight` : "",
    `   "${p.brandName}" — set small (the brand name)`,
    opts?.includeUrl ? `   "${p.domain}" — set small` : "",
    `• Spelling must be 100% correct, letter for letter. Do NOT invent, add, translate, repeat, or drop any words.`,
    `• Use ONE clean, modern geometric sans-serif typeface (Inter / Geist / Helvetica style) for everything. Consistent, even letterforms.`,
    `• Tight professional kerning; comfortable line-height; no letter overlaps, no squished or stretched glyphs, no warping, no faux-3D.`,
    `• Strong contrast: place text over the calmest part of the composition so every character is perfectly legible.`,
    `• Clear hierarchy and generous breathing room. Never hyphenate or break a word across lines.`,
    `• IMPORTANT: everything in this brief is an instruction to you, NOT copy to render. The ONLY text that may appear in the image is the quoted strings listed above. Never transcribe rules, notes, or any other sentence from this brief into the artwork.`,
  ]
    .filter(Boolean)
    .join("\n");
}

const HARD_RULES = [
  `HARD RULES:`,
  `• Never print hex codes, color codes, or color names anywhere in the image.`,
  `• No placeholder labels, lorem ipsum, hashtags, fake URLs, or gibberish micro-text of any kind.`,
  `• Absolutely NO people, faces, or hands.`,
  `• No watermarks, borders, or frames.`,
].join("\n");

const brandLine = (p: PromptInput) =>
  [
    `The brand: ${p.brandName} (${p.domain})${p.industry ? `, ${p.industry}` : ""}.`,
    p.summary ? `What they sell: ${p.summary}` : "",
    `Brand visual mood: ${p.mood}.`,
  ]
    .filter(Boolean)
    .join(" ");

export const ALL_AD_CONCEPTS: AdConcept[] = [
  {
    key: "product_hero",
    label: "Product Hero",
    bestFor: "physical products, hardware, tangible goods",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 editorial advertisement: a single hero product shot with dramatic studio lighting.`,
        brandLine(p),
        `One flagship product (or an elegant stand-in object that embodies the offering) on a seamless studio backdrop in ${p.colorA}, lit with one dramatic key light and a soft rim light in ${p.colorB}. Deep, soft shadow under the object. Composition like a high-end print campaign: product slightly off-center, headline in the negative space.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "isometric",
    label: "Isometric World",
    bestFor: "B2B SaaS, developer tools, APIs, platforms",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement in the style of a top-tier SaaS landing page: a crisp isometric 3D diagram.`,
        brandLine(p),
        `A clean isometric illustration of an abstract system — floating planes, nodes, and connecting pipes — that visualises the product working. Dominant color ${p.colorA} with accents of ${p.colorB} on a very light neutral background. Soft ambient occlusion, precise 30-degree isometric angles, matte materials, zero clutter.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "typographic",
    label: "Type Poster",
    bestFor: "statement-driven brands, abstract products, bold positioning",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 Swiss-design typographic poster. Typography IS the artwork.`,
        brandLine(p),
        `Massive, confident headline type filling most of the frame on a flat ${p.colorA} background, set on a strict grid with one deliberate asymmetric offset. A single thin rule line and the small wordmark and URL anchor the corners. Ink color in ${p.colorB} or the strongest opposite of the background — the type must contrast HARD against the background (never light-on-light or dark-on-dark). International Typographic Style: order, whitespace, tension.`,
        typography(p, { includeUrl: true }),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "macro_material",
    label: "Macro Material",
    bestFor: "beauty, food, fashion, premium finishes and textures",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement built on an extreme macro close-up of a beautiful material.`,
        brandLine(p),
        `Fill the frame with one sumptuous macro texture that evokes the brand — liquid, fabric, brushed metal, glass, or organic surface — rendered in ${p.colorA} with glints of ${p.colorB}. Shallow depth of field, razor-sharp focal band, luxurious light. The texture leaves one calm, softly blurred region where the text sits.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "gradient_field",
    label: "Gradient Field",
    bestFor: "AI products, fintech, abstract or intangible services",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement made of pure atmosphere: a vast, smooth gradient field.`,
        brandLine(p),
        `An expansive color field flowing from deep ${p.colorA} into luminous ${p.colorB}, with subtle grain and one soft light bloom rising from the lower third — like dawn over a horizon. No objects at all. The gradient alone carries the emotion; the typography carries the message.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "editorial_spread",
    label: "Editorial Spread",
    bestFor: "lifestyle, food and drink, travel, hospitality",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement styled like a page from a minimalist lifestyle magazine (Kinfolk / Monocle).`,
        brandLine(p),
        `A quiet, beautifully art-directed still-life scene on a table or shelf — objects related to the offering, natural window light, muted tones grounded in ${p.colorA} with a single accent of ${p.colorB}. Lots of calm negative space. Text set like refined magazine layout: small, precise, unhurried.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "sculptural_object",
    label: "Sculptural Object",
    bestFor: "tech and AI brands with no physical product",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement featuring one abstract 3D sculpture in an empty studio space.`,
        brandLine(p),
        `A single elegant sculptural form — a twisted ribbon, torus, or fluid glass shape — that metaphorically embodies the product, floating in a softly lit infinite room washed in ${p.colorA}. The sculpture refracts and glows with ${p.colorB}. Octane-render quality, soft global illumination, mirror-calm floor reflection.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "data_viz",
    label: "Chart as Art",
    bestFor: "analytics, BI, observability, data platforms",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement where an abstract data visualisation becomes the artwork.`,
        brandLine(p),
        `One oversized, beautiful chart form — an ascending line, layered area curves, or a radial plot — drawn as art, not UI: thick luminous strokes in ${p.colorB} over a deep ${p.colorA} canvas, with faint grid ticks and glow. The curve should feel optimistic and rising. No axis labels, no numbers, no legend — pure form.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "blueprint",
    label: "Blueprint",
    bestFor: "engineering, hardware, infrastructure, industrial",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement drawn as a technical blueprint schematic.`,
        brandLine(p),
        `A precise engineering drawing of a machine or system that represents the offering: fine white and ${p.colorB} line work, dashed construction lines, small circular detail callouts, on a rich ${p.colorA} drafting-paper background with subtle grid. Confident, exact, drafted by hand on a light table. The callout circles stay EMPTY — no annotation text.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "retro_arcade",
    label: "Retro Arcade",
    bestFor: "gaming, entertainment, playful consumer brands",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement in a late-80s arcade aesthetic — but executed with modern polish.`,
        brandLine(p),
        `A neon wireframe grid racing toward a glowing horizon, a low chrome sun, and one bold geometric shape floating center — all in electric ${p.colorA} and ${p.colorB} against near-black. Scanline shimmer, phosphor glow, immaculate symmetry. Nostalgic but expensive-looking.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "monochrome_crop",
    label: "Monochrome Crop",
    bestFor: "luxury, watches, minimalist premium brands",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement: a tight, single-hue detail crop with extreme restraint.`,
        brandLine(p),
        `An ultra-tight crop of one exquisite detail — an edge, a curve, a clasp, a surface — of an object embodying the brand, rendered entirely in tones of ${p.colorA} (highlights, midtones, shadows all within that hue). One razor-thin accent line of ${p.colorB}. Dramatic chiaroscuro, vast dark negative space where the type sits.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
  {
    key: "collage",
    label: "Paper Collage",
    bestFor: "agencies, education, media, creative brands",
    buildPrompt: (p) =>
      [
        `A premium square 1:1 advertisement composed as a layered cut-paper collage.`,
        brandLine(p),
        `Hand-cut paper shapes — arcs, torn strips, circles, and abstract forms suggesting the offering — layered with real drop shadows on a warm paper background. Palette anchored in ${p.colorA} and ${p.colorB} with cream and kraft accents. Playful but rigorously composed, like a gallery poster.`,
        typography(p),
        HARD_RULES,
      ].join("\n\n"),
  },
];

export const CONCEPT_KEYS = ALL_AD_CONCEPTS.map((c) => c.key) as [ConceptKey, ...ConceptKey[]];

export const conceptByKey = (key: string): AdConcept | undefined =>
  ALL_AD_CONCEPTS.find((c) => c.key === key);
