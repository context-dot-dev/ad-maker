/** Fixed product policy shared by the contract, catalogs, planner, and Gallery. */
export const AD_RUN_SIZE = 6 as const;
export const AD_PRIMARY_MODEL_COUNT = 3 as const;

export type Six<T> = readonly [T, T, T, T, T, T];

export const AD_RUN_LIMITS = {
  domain: 253,
  brandName: 80,
  description: 2000,
  industry: 120,
  summary: 480,
  mood: 160,
  promptColor: 40,
  logoUrl: 2048,
  palette: 8,
  colorName: 80,
  directionKey: 80,
  imageModelId: 120,
  headline: 60,
  headlineWords: 3,
  subheadline: 120,
  subheadlineWords: 12,
} as const;
