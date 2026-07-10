export type Brand = {
  domain: string;
  name: string;
  description: string;
  pageContext: string;
  colors: string[];
  colorNames: string[];
};

export type Copy = {
  headline: string;
  sub: string;
};

/** How the client canvas should lay type over generated artwork. Fractions of the image (0..1). */
export type TextLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  align: "left" | "center" | "right";
  theme: "light" | "dark";
  scrim: boolean;
};

export const DEFAULT_LAYOUT: TextLayout = { x: 0.06, y: 0.14, w: 0.5, h: 0.72, align: "left", theme: "light", scrim: true };
