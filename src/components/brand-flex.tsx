"use client";

import { useEffect, useState } from "react";
import { BoltIcon, ChevronDown, ColorIcon, RefreshIcon } from "@/components/icons";
import type { BrandAssets } from "@/lib/types";

export function BrandFlex({ brand, url, setUrl, onLoad, loading }: {
  brand: BrandAssets;
  url: string;
  setUrl: (v: string) => void;
  onLoad: () => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const logoTileBg = brand.darkColor ?? "#030014";
  const assetCount = brand.colors.length + brand.logos.length + brand.backdrops.length;

  // Reveal the full brand kit on load to flex the API, then gently tuck it away.
  useEffect(() => {
    setExpanded(true);
    const t = setTimeout(() => setExpanded(false), 2600);
    return () => clearTimeout(t);
  }, [brand.domain]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <button onClick={() => setExpanded((v) => !v)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded}>
          <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl p-2 ring-1 ring-border" style={{ background: logoTileBg }}>
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-lg font-bold text-white">{(brand.name ?? brand.domain)[0].toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-foreground">{brand.name ?? brand.domain}</p>
            <p className="truncate text-xs text-muted-foreground">{brand.domain}</p>
          </div>
        </button>

        <div className={`hidden items-center gap-3 transition-opacity duration-300 md:flex ${expanded ? "opacity-0" : "opacity-100"}`}>
          <div className="flex items-center -space-x-1">
            {brand.colors.slice(0, 5).map((c) => (
              <span key={c.hex} className="size-5 rounded-full ring-2 ring-card" style={{ background: c.hex }} title={c.hex} />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">{assetCount} assets</span>
        </div>

        <span className="hidden items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-brand-washed ring-1 ring-primary/40 sm:flex" title="Context.dev credits consumed">
          <BoltIcon /> {(brand.creditsConsumed ?? 10).toLocaleString()}
        </span>

        <form onSubmit={(e) => { e.preventDefault(); onLoad(); }} className="flex items-center gap-2">
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Change brand…" className="input h-9 w-full sm:w-40" disabled={loading} />
          <button type="submit" disabled={loading || !url.trim()} aria-label="Load brand" className="btn-secondary h-9 shrink-0 px-3">
            {loading ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" /> : <RefreshIcon />}
          </button>
        </form>

        <button onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Collapse" : "Expand"} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-white/[0.03] text-muted-foreground transition hover:text-foreground">
          <ChevronDown className={`size-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className={`grid transition-all duration-500 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-border p-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 px-2.5 py-1 text-[11px] font-semibold text-brand-washed ring-1 ring-primary/30">
                <BoltIcon /> Extracted live by the Context.dev Brand API
              </span>
              <span className="text-[11px] text-muted-foreground">{assetCount} assets · in under a second</span>
            </div>

            {(brand.description || brand.slogan) && (
              <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground animate-fade-up">{brand.description ?? brand.slogan}</p>
            )}

            {brand.colors.length > 0 && (
              <div className="animate-fade-up [animation-delay:60ms]">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ColorIcon /> Color palette <span className="font-normal">({brand.colors.length})</span></p>
                <div className="flex flex-wrap gap-2">
                  {brand.colors.map((c, i) => (
                    <div key={`${c.hex}-${i}`} className="group/color animate-fade-up" style={{ animationDelay: `${80 + i * 25}ms` }}>
                      <div className="size-10 rounded-xl ring-1 ring-inset ring-white/10 transition duration-200 group-hover/color:scale-110 group-hover/color:shadow-glow" style={{ background: c.hex }} />
                      <span className="mt-1 block text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground opacity-0 transition group-hover/color:opacity-100">{c.hex.replace("#", "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brand.logos.length > 0 && (
              <div className="animate-fade-up [animation-delay:120ms]">
                <p className="mb-2.5 text-xs font-semibold text-muted-foreground">Logos <span className="font-normal">({brand.logos.length})</span></p>
                <div className="flex flex-wrap gap-2">
                  {brand.logos.map((l, i) => (
                    <div key={i} className="grid size-14 place-items-center overflow-hidden rounded-xl p-2.5 ring-1 ring-border transition duration-200 hover:scale-105" style={{ background: logoTileBg, animationDelay: `${140 + i * 30}ms` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brand.backdrops.length > 0 && (
              <div className="animate-fade-up [animation-delay:180ms]">
                <p className="mb-2.5 text-xs font-semibold text-muted-foreground">Imagery <span className="font-normal">({brand.backdrops.length})</span></p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {brand.backdrops.map((bd, i) => (
                    <div key={i} className="relative aspect-[16/10] w-52 shrink-0 overflow-hidden rounded-xl ring-1 ring-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bd.url} alt="" loading="lazy" className="size-full object-cover transition duration-500 hover:scale-[1.06]" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Colors", value: brand.colors.length },
                { label: "Logos", value: brand.logos.length },
                { label: "Images", value: brand.backdrops.length },
                { label: "Socials", value: brand.socials },
              ].map((m) => (
                <span key={m.label} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.03] px-3 py-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{m.value}</span> {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
