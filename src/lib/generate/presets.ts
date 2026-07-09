/** Target output specs + the gpt-image-1 canvas we actually render on. */
export const FORMAT_SPEC = {
  x_banner:  { label: "X (Twitter) banner", w: 1500, h: 500,  canvas: "1536x1024" as const, dalle: "1792x1024" as const, crop: "wide 3:1 banner — keep the composition working in a centered horizontal band with large empty margins top & bottom" },
  li_banner: { label: "LinkedIn banner",    w: 1584, h: 396,  canvas: "1536x1024" as const, dalle: "1792x1024" as const, crop: "ultra-wide 4:1 cover — keep the composition tightly centered with big margins top & bottom" },
  li_post:   { label: "LinkedIn post",      w: 1200, h: 1200, canvas: "1024x1024" as const, dalle: "1024x1024" as const, crop: "square 1:1 poster" },
  ad_16_9:   { label: "16:9 ad",            w: 1200, h: 675,  canvas: "1536x1024" as const, dalle: "1792x1024" as const, crop: "16:9 landscape poster" },
} as const;

export type FormatId = keyof typeof FORMAT_SPEC;
