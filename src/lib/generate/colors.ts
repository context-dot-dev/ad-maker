/**
 * Image models love to literally print hex strings like "#543cfc" onto buttons
 * when handed raw codes, so brand colors are always converted to plain-English
 * phrases ("vivid purple", "deep navy") before they reach a prompt.
 */

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl | null {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}/i.test(full)) return null;
  const n = parseInt(full.slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hueName(h: number, l: number): string {
  if (h < 15) return "red";
  if (h < 40) return "orange";
  if (h < 55) return "amber";
  if (h < 70) return "yellow";
  if (h < 90) return "lime green";
  if (h < 150) return "green";
  if (h < 175) return "teal";
  if (h < 200) return "cyan";
  if (h < 235) return l < 32 ? "navy" : "blue";
  if (h < 260) return "indigo";
  if (h < 285) return "violet";
  if (h < 310) return "purple";
  if (h < 335) return "magenta";
  return "pink";
}

export function describeColor(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return "deep navy";
  const { h, s, l } = hsl;
  if (s < 10) {
    if (l < 12) return "near-black";
    if (l < 30) return "charcoal";
    if (l < 55) return "slate gray";
    if (l < 82) return "soft gray";
    return "off-white";
  }
  const hue = hueName(h, l);
  if (hue === "navy") return "deep navy";
  if (l < 25) return `deep ${hue}`;
  if (l > 80) return `pale ${hue}`;
  if (s > 70 && l >= 38 && l <= 66) return `vivid ${hue}`;
  if (s > 40) return `rich ${hue}`;
  return `muted ${hue}`;
}

/**
 * Pick two workhorse brand colors: the most vivid, mid-brightness color as the
 * dominant, and a second that is visibly distinct from it. Falls back to a
 * confident default pair when the palette is empty or all-gray.
 */
export function pickBrandColors(colors: { hex: string }[]): { a: string; b: string } {
  const scored = colors
    .map((c) => ({ hex: c.hex, hsl: hexToHsl(c.hex) }))
    .filter((c): c is { hex: string; hsl: Hsl } => c.hsl !== null)
    .map((c) => ({ ...c, score: c.hsl.s - Math.abs(c.hsl.l - 50) }))
    .sort((x, y) => y.score - x.score);

  if (scored.length === 0) return { a: "vivid violet", b: "deep navy" };

  const first = scored[0];
  const second =
    scored.slice(1).find((c) => {
      const dh = Math.abs(c.hsl.h - first.hsl.h);
      const hueDist = Math.min(dh, 360 - dh);
      return hueDist >= 30 || Math.abs(c.hsl.l - first.hsl.l) >= 25;
    }) ?? scored[1];

  return {
    a: describeColor(first.hex),
    b: second ? describeColor(second.hex) : "deep navy",
  };
}
