/** Cross-runtime metadata for the Creative Directions available to an Ad Run. */
export const CREATIVE_DIRECTIONS = [
  {
    key: "product_hero",
    label: "Product Hero",
    bestFor: "physical products, hardware, tangible goods",
  },
  {
    key: "isometric",
    label: "Isometric World",
    bestFor: "B2B SaaS, developer tools, APIs, platforms",
  },
  {
    key: "typographic",
    label: "Type Poster",
    bestFor: "statement-driven brands, abstract products, bold positioning",
  },
  {
    key: "macro_material",
    label: "Macro Material",
    bestFor: "beauty, food, fashion, premium finishes and textures",
  },
  {
    key: "gradient_field",
    label: "Gradient Field",
    bestFor: "AI products, fintech, abstract or intangible services",
  },
  {
    key: "editorial_spread",
    label: "Editorial Spread",
    bestFor: "lifestyle, food and drink, travel, hospitality",
  },
  {
    key: "sculptural_object",
    label: "Sculptural Object",
    bestFor: "tech and AI brands with no physical product",
  },
  {
    key: "data_viz",
    label: "Chart as Art",
    bestFor: "analytics, BI, observability, data platforms",
  },
  {
    key: "blueprint",
    label: "Blueprint",
    bestFor: "engineering, hardware, infrastructure, industrial",
  },
  {
    key: "retro_arcade",
    label: "Retro Arcade",
    bestFor: "gaming, entertainment, playful consumer brands",
  },
  {
    key: "monochrome_crop",
    label: "Monochrome Crop",
    bestFor: "luxury, watches, minimalist premium brands",
  },
  {
    key: "collage",
    label: "Paper Collage",
    bestFor: "agencies, education, media, creative brands",
  },
] as const;

export type CreativeDirection = (typeof CREATIVE_DIRECTIONS)[number];
export type CreativeDirectionKey = CreativeDirection["key"];

export const CREATIVE_DIRECTION_KEYS = CREATIVE_DIRECTIONS.map(
  ({ key }) => key,
) as [CreativeDirectionKey, ...CreativeDirectionKey[]];

export function directionByKey(key: string): CreativeDirection | undefined {
  return CREATIVE_DIRECTIONS.find((direction) => direction.key === key);
}
