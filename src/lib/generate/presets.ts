// Deterministic design vocabulary. The art director CHOOSES from these and then
// exaggerates them into a poster — it never invents generic icon clip-art.

/** Named visual languages. Each carries atmosphere + texture, not just "clean". */
export const DESIGN_SYSTEMS = {
  stripe: {
    label: "Stripe",
    look: "polished fintech infrastructure: confident, cosmic, quietly futuristic",
    background: "deep space navy or the brand's darkest color with soft top-light bloom",
    type: "clean geometric sans, heavy weight, tight tracking",
    texture: "fine luminous line-work, gentle atmospheric gradients, subtle grain and depth",
  },
  linear: {
    label: "Linear",
    look: "engineered dev-tool: dark, precise, cinematic",
    background: "near-black with faint depth, a single glowing accent",
    type: "compact grotesk, high contrast",
    texture: "rim light, soft bloom, faint fine grid, real sense of space",
  },
  apple: {
    label: "Apple",
    look: "premium consumer: serene, sculptural, product-forward",
    background: "graphite or soft light, immense whitespace, studio lighting",
    type: "large refined sans, generous leading",
    texture: "soft realistic shadows, gentle caustics, one hero form under studio light",
  },
  swiss: {
    label: "Swiss / International",
    look: "editorial poster design: rational, typographic, timeless",
    background: "one flat saturated color, no gradient",
    type: "oversized helvetica-like sans on a strong grid",
    texture: "flat but bold — typography and one color plane are the texture",
  },
  technical: {
    label: "Technical blueprint",
    look: "engineering schematic turned art piece: precise, diagrammatic",
    background: "solid dark with a faint blueprint field",
    type: "grotesk / mono labels, small caps",
    texture: "wireframe line-art, 2px strokes, exploded structure, measurement ticks",
  },
  raycast: {
    label: "Raycast",
    look: "sleek prosumer: vivid, glossy, high-energy but controlled",
    background: "rich brand-colored gradient over a dark base with bloom",
    type: "tight bold sans",
    texture: "glossy 3D / glass, soft bloom, liquid highlights, high polish",
  },
  editorial: {
    label: "Editorial / Magazine",
    look: "high-fashion magazine cover: expressive, dramatic",
    background: "bold flat color or duotone",
    type: "oversized display headline, mixed weights",
    texture: "halftone grain, dramatic contrast, one striking graphic element",
  },
  vercel: {
    label: "Vercel",
    look: "stark monochrome: black & white with extreme restraint",
    background: "pure black or pure white void",
    type: "geometric sans, precise",
    texture: "one high-contrast geometric form, a single spotlight, deep shadow",
  },
  notion: {
    label: "Notion",
    look: "warm editorial productivity: tactile, calm, human",
    background: "off-white or soft cream, lots of air",
    type: "humanist sans, comfortable, heavy where it counts",
    texture: "soft paper fiber, gentle daylight shadows, layered planes",
  },
} as const;

export type DesignSystemId = keyof typeof DESIGN_SYSTEMS;

/**
 * Brand-appropriate HERO objects (poster motifs), not icons. The art director
 * picks ONE and exaggerates it. Never globes-as-clipart / nodes / laptops.
 */
export const MOTIFS: Record<DesignSystemId, string[]> = {
  stripe: [
    "a vast orbital grid sphere floating in space",
    "a smooth planet with a soft glowing atmosphere",
    "sweeping metallic ribbons twisting through the frame",
    "luminous payment light-paths arcing across a dark void",
    "a monolithic glass slab catching colored light",
  ],
  linear: [
    "a single razor-sharp light beam cutting through darkness",
    "a fast motion streak trailing into depth",
    "a minimal geometric monolith lit from one side",
    "a glowing gradient horizon in a black void",
    "clean parallel precision lines receding into space",
  ],
  apple: [
    "a single floating gradient orb under studio light",
    "a smooth glass slab with soft caustics",
    "one sculptural abstract form, immaculately lit",
    "a serene color-field horizon with gentle haze",
  ],
  swiss: [
    "one massive cropped typographic form",
    "two bold intersecting color planes",
    "a single oversized geometric shape off-center",
    "a strong diagonal color block splitting the frame",
  ],
  technical: [
    "an exploded wireframe structure suspended in space",
    "a large blueprint schematic of an abstract machine",
    "a precise isometric structural frame",
    "a measurement field with fine ticks and one focal form",
  ],
  raycast: [
    "a glossy 3D glass sculpture with rainbow bloom",
    "a vivid liquid-chrome blob mid-morph",
    "a translucent gradient ribbon folding through light",
    "a polished metallic form glowing from within",
  ],
  editorial: [
    "an oversized cropped letterform as sculpture",
    "a bold duotone abstract composition",
    "a rich halftone texture field with one focal shape",
    "a dramatic high-contrast color split",
  ],
  vercel: [
    "a stark black triangular monolith in a white void",
    "a single spotlit geometric plane",
    "a high-contrast floating shard casting a long shadow",
    "overlapping black planes in an empty void",
  ],
  notion: [
    "a giant folded paper sheet occupying most of the frame",
    "a sculptural stack of layered documents",
    "floating editorial paper planes with soft shadows",
    "a large open notebook rendered as a paper sculpture",
    "overlapping modular paper blocks casting soft shadows",
  ],
};

/** Intentionally UNBALANCED poster layouts. No tidy centered templates. */
export const COMPOSITION_ARCHETYPES = {
  hero_dominant: "one gigantic hero object filling ~70% of the frame; typography kept small and tucked into a single corner",
  giant_type: "massive typography as the main element; the hero object smaller and bleeding off one edge",
  type_over_visual: "a full-bleed atmospheric visual with bold typography set confidently over it",
  off_center: "hero object pushed hard to one side, leaving a large, intentional void of empty space",
  bottom_anchored: "visual fills the upper two-thirds; typography anchored low and to the left",
  diagonal: "a strong diagonal composition that creates tension and movement",
} as const;

export type CompositionArchetypeId = keyof typeof COMPOSITION_ARCHETYPES;

/** Target output specs + the gpt-image-1 canvas we actually render on. */
export const FORMAT_SPEC = {
  x_banner:  { label: "X (Twitter) banner", w: 1500, h: 500,  canvas: "1536x1024" as const, crop: "wide 3:1 banner — keep the composition working in a centered horizontal band with large empty margins top & bottom" },
  li_banner: { label: "LinkedIn banner",    w: 1584, h: 396,  canvas: "1536x1024" as const, crop: "ultra-wide 4:1 cover — keep the composition tightly centered with big margins top & bottom" },
  li_post:   { label: "LinkedIn post",      w: 1200, h: 1200, canvas: "1024x1024" as const, crop: "square 1:1 poster" },
  ad_16_9:   { label: "16:9 ad",            w: 1200, h: 675,  canvas: "1536x1024" as const, crop: "16:9 landscape poster" },
} as const;

export type FormatId = keyof typeof FORMAT_SPEC;
