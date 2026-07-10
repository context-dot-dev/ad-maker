export type BrandColor = { hex: string; name: string | null };
export type BrandImage = { url: string };

export type BrandAssets = {
  domain: string;
  name: string | null;
  description: string | null;
  slogan: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  darkColor: string | null;
  colors: BrandColor[];
  logos: BrandImage[];
  backdrops: BrandImage[];
  socials: number;
  creditsConsumed: number | null;
  creditsRemaining: number | null;
};

export type FormatId = "li_post" | "x_banner" | "li_banner";
export type StyleId = "clean" | "bold" | "minimal" | "playful" | "elegant";
export type RenderMode = "poster" | "artwork" | "art";

export type TextLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  align: "left" | "center" | "right";
  theme: "light" | "dark";
  scrim: boolean;
};

export type Result = {
  format: FormatId;
  url: string;
  mode: RenderMode;
  headline: string;
  sub: string;
  cta: string;
  layout?: TextLayout;
};
