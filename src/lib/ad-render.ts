import type { RenderMode, TextLayout } from "./types";

export type AdPaint = {
  W: number;
  H: number;
  img: HTMLImageElement;
  mode: RenderMode;
  headline: string;
  sub: string;
  cta: string;
  brandName: string;
  domain: string;
  primary: string;
  fontFamily: string;
  layout: TextLayout;
};

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
  } catch {
    /* letterSpacing unsupported — safe to ignore */
  }
}

/**
 * Paints a generated ad onto a canvas. Poster and pure-artwork modes are the raw
 * image (text is baked in by the model). Only "artwork" mode gets our own
 * pixel-perfect typography overlay laid out from the vision-planned region.
 */
export function drawAd(ctx: CanvasRenderingContext2D, d: AdPaint) {
  const { W, H, img, fontFamily: ff } = d;

  ctx.clearRect(0, 0, W, H);
  if (img.width && img.height) {
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  if (d.mode !== "artwork") return;

  const L = d.layout;
  const light = L.theme === "light";
  const fg = light ? "#ffffff" : "#0b0b12";
  const fgSub = light ? "rgba(255,255,255,0.85)" : "rgba(11,11,18,0.72)";
  const fgDim = light ? "rgba(255,255,255,0.62)" : "rgba(11,11,18,0.55)";

  if (L.scrim) {
    const cx = (L.x + L.w / 2) * W;
    const fromLeft = cx < W / 2;
    const base = light ? "6,8,15" : "255,255,255";
    const g = ctx.createLinearGradient(fromLeft ? 0 : W, 0, fromLeft ? W : 0, 0);
    g.addColorStop(0, `rgba(${base},0.82)`);
    g.addColorStop(0.5, `rgba(${base},0.4)`);
    g.addColorStop(0.85, `rgba(${base},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const inset = Math.round(W * 0.012);
  const rx = L.x * W + inset;
  const ry = L.y * H + inset;
  const rw = Math.max(80, L.w * W - inset * 2);
  const rh = Math.max(60, L.h * H - inset * 2);
  const wSize = Math.max(15, Math.round(Math.min(rw * 0.05, W * 0.018)));
  const bottomReserve = wSize * 2.4;

  const cta = d.cta.trim();

  ctx.textBaseline = "top";
  const maxLines = W / H >= 2 ? 2 : 3;
  let chosen: { hSize: number; sSize: number; hLines: string[]; sLines: string[]; hLineH: number; sLineH: number; gapHS: number } | null = null;
  for (let hSize = Math.round(Math.min(rw * 0.14, rh * 0.5)); hSize >= 14; hSize -= 2) {
    const sSize = Math.max(12, Math.round(hSize * 0.4));
    setTracking(ctx, -hSize * 0.02);
    ctx.font = `700 ${hSize}px ${ff}`;
    const hLines = wrapLines(ctx, d.headline, rw, maxLines);
    setTracking(ctx, 0);
    ctx.font = `500 ${sSize}px ${ff}`;
    const sLines = d.sub ? wrapLines(ctx, d.sub, rw, 2) : [];
    const hLineH = hSize * 1.12;
    const sLineH = sSize * 1.32;
    const gapHS = sLines.length ? hSize * 0.5 : 0;
    const ctaH = cta ? sSize * 2.1 + hSize * 0.55 : 0;
    const total = hLines.length * hLineH + gapHS + sLines.length * sLineH + ctaH;
    if (total <= rh - bottomReserve || hSize <= 14) {
      chosen = { hSize, sSize, hLines, sLines, hLineH, sLineH, gapHS };
      break;
    }
  }
  if (!chosen) return;
  const { hSize, sSize, hLines, sLines, hLineH, sLineH, gapHS } = chosen;

  const anchorX = L.align === "center" ? rx + rw / 2 : L.align === "right" ? rx + rw : rx;
  ctx.textAlign = L.align;
  ctx.shadowColor = light ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)";
  ctx.shadowBlur = Math.round(W * 0.005);

  let y = ry;
  setTracking(ctx, -hSize * 0.02);
  ctx.font = `700 ${hSize}px ${ff}`;
  ctx.fillStyle = fg;
  for (const line of hLines) {
    ctx.fillText(line, anchorX, y);
    y += hLineH;
  }
  setTracking(ctx, 0);

  if (sLines.length) {
    y += gapHS;
    ctx.font = `500 ${sSize}px ${ff}`;
    ctx.fillStyle = fgSub;
    for (const line of sLines) {
      ctx.fillText(line, anchorX, y);
      y += sLineH;
    }
  }

  if (cta) {
    y += hSize * 0.55;
    ctx.shadowBlur = 0;
    const cSize = Math.round(sSize * 0.92);
    ctx.font = `600 ${cSize}px ${ff}`;
    const ctaTextW = ctx.measureText(cta).width;
    const ctaW = ctaTextW + cSize * 1.8;
    const ctaH = cSize * 2.1;
    const ctaX = L.align === "center" ? anchorX - ctaW / 2 : L.align === "right" ? anchorX - ctaW : anchorX;
    ctx.fillStyle = d.primary;
    roundRect(ctx, ctaX, y, ctaW, ctaH, ctaH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(cta, ctaX + ctaW / 2, y + ctaH / 2 + 1);
    ctx.textAlign = L.align;
    ctx.textBaseline = "top";
  }

  ctx.textAlign = "left";
  ctx.shadowColor = light ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)";
  ctx.shadowBlur = Math.round(W * 0.004);
  const wy = ry + rh - wSize;
  ctx.font = `600 ${wSize}px ${ff}`;
  ctx.fillStyle = fg;
  ctx.fillText(d.brandName, rx, wy);
  const bw = ctx.measureText(d.brandName).width;
  ctx.font = `500 ${wSize}px ${ff}`;
  ctx.fillStyle = fgDim;
  ctx.fillText(d.domain, rx + bw + wSize * 0.6, wy);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}
