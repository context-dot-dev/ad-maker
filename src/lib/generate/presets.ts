/**
 * Target output specs + the gpt-image-1 canvas we actually render on.
 *
 * `mode` decides HOW the ad is produced:
 *  - "poster":  gpt-image-1 paints the FULL ad (headline baked in). Reserved for
 *               1:1 — the aspect ratio the model handles typography well in.
 *  - "artwork": gpt-image-1 paints ONLY a background (with reserved negative space);
 *               our own canvas renderer lays the type/wordmark on top. Wide banners
 *               use this because diffusion models mangle typography in extreme ratios.
 */
export const FORMAT_SPEC = {
  li_post:   { label: "LinkedIn post",      w: 1200, h: 1200, aspect: 1,          canvas: "1024x1024" as const, dalle: "1024x1024" as const, mode: "poster" as const },
  x_banner:  { label: "X (Twitter) banner", w: 1500, h: 500,  aspect: 3,          canvas: "1536x1024" as const, dalle: "1792x1024" as const, mode: "art" as const },
  li_banner: { label: "LinkedIn banner",    w: 1584, h: 396,  aspect: 1584 / 396, canvas: "1536x1024" as const, dalle: "1792x1024" as const, mode: "art" as const },
} as const;

export type FormatId = keyof typeof FORMAT_SPEC;

/** What the client renders. "art" = pure artwork, no overlay (user's "Artwork only"). */
export type RenderMode = "poster" | "artwork" | "art";
