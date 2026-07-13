/** Client-side view of what /api/brief returns. */

export type BrandColor = { hex: string; name: string | null };

export type AdBriefView = {
  domain: string;
  brandName: string;
  description: string;
  industry: string;
  summary: string;
  mood: string;
  colorA: string;
  colorB: string;
  logoUrl: string | null;
  colors: BrandColor[];
};

export type PlannedConceptView = {
  key: string;
  label: string;
  model: string;
  headline: string;
  subheadline: string;
};
