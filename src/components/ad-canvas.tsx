"use client";

import { useEffect, useRef } from "react";
import { drawAd } from "@/lib/ad-render";
import { DEFAULT_LAYOUT, type FormatDef } from "@/lib/formats";
import type { BrandAssets, Result } from "@/lib/types";

export function AdCanvas({ index, r, fmt, brand, register }: {
  index: number;
  r: Result;
  fmt: FormatDef;
  brand: BrandAssets;
  register: (i: number, c: HTMLCanvasElement | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = fmt.w;
    canvas.height = fmt.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    const img = new Image();
    const paint = () => {
      if (cancelled) return;
      drawAd(ctx, {
        W: fmt.w,
        H: fmt.h,
        img,
        mode: r.mode,
        headline: r.headline,
        sub: r.sub,
        cta: r.cta,
        brandName: brand.name ?? brand.domain,
        domain: brand.domain,
        primary: brand.primaryColor ?? brand.colors[0]?.hex ?? "#2663ec",
        fontFamily: (typeof window !== "undefined" && getComputedStyle(document.body).fontFamily) || "Geist, sans-serif",
        layout: r.layout ?? DEFAULT_LAYOUT,
      });
      register(index, canvas);
    };
    img.onload = () => {
      if (document.fonts?.ready) document.fonts.ready.then(paint).catch(paint);
      else paint();
    };
    img.onerror = paint;
    img.src = r.url;
    return () => {
      cancelled = true;
      register(index, null);
    };
  }, [index, r, fmt, brand, register]);

  return <canvas ref={ref} className="block h-auto w-full" style={{ aspectRatio: String(fmt.ratio) }} aria-label={`${fmt.label} ad`} />;
}
