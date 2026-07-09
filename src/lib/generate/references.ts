/**
 * Pick the strongest real brand assets to use as style references. Marketing /
 * hero imagery (backdrops) first — the logo last, and only a couple, so the
 * poster inherits the brand's *language*, not just its mark.
 */
export function selectReferences(input: { backdrops: string[]; logoUrl?: string | null }): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (u?: string | null) => {
    if (!u) return;
    const url = u.trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  input.backdrops.forEach(add);
  add(input.logoUrl);
  return out.slice(0, 4);
}
