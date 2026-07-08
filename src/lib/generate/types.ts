import type { DesignSystemId, CompositionArchetypeId } from "./presets";

export type Brand = {
  domain: string;
  name: string;
  description: string;
  pageContext: string;
  colors: string[];
  colorNames: string[];
};

export type CreativeDirection = {
  industry: string;
  designLanguage: DesignSystemId;
  campaignConcept: string;
  mood: string;
  paletteUsage: string;
  backgroundApproach: string;
  avoid: string[];
  angles: string[];
};

/** The visual idea for a single poster — deliberately art-directed, not UI-oriented. */
export type VisualConcept = {
  heroObject: string;
  composition: CompositionArchetypeId;
  scale: string;
  texture: string;
  lighting: string;
  atmosphere: string;
  typographyWeight: string;
  emptySpace: "medium" | "high" | "very high";
  focalPoint: string;
};

export type Copy = {
  headline: string;
  sub: string;
};
