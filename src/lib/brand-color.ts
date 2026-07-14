const BRAND_COLOR = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export type BrandColor = { hex: string; name: string | null };

/** Return the canonical CSS hex form accepted throughout an Ad Run. */
export function normalizeBrandColorHex(value: string): string | null {
  const raw = value.trim();
  if (!BRAND_COLOR.test(raw)) return null;
  return `#${raw.replace(/^#/, "").toLowerCase()}`;
}
