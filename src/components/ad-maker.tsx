"use client";

import { useState } from "react";
import ImageMouseTrail from "@/components/ui/mousetrail";
import { Header, FortuneCookie } from "@/components/site-header";
import {
  BoltIcon,
  DownloadIcon,
  GlobeIcon,
  RefreshIcon,
  XIcon,
} from "@/components/icons";
import { AD_RUN_SIZE } from "@/lib/ad-run";
import { directionByKey } from "@/lib/generate/directions";
import { imageModelById } from "@/lib/generate/models";
import type { AdMakerController, AdSlot } from "@/hooks/use-ad-maker";

type IdleController = Extract<AdMakerController, { phase: "idle" }>;
type WorkspaceController = Exclude<AdMakerController, { phase: "idle" }>;

const EXAMPLE_DOMAINS = ["stripe.com", "linear.app", "notion.so", "vercel.com"];
const AD_EXAMPLES = [
  "/ad-examples/stripe.png",
  "/ad-examples/linear.png",
  "/ad-examples/notion.png",
  "/ad-examples/vercel.png",
  "/ad-examples/openai.png",
  "/ad-examples/webflow.png",
];

export function AdMaker({ s }: { s: AdMakerController }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background font-sans antialiased">
      {s.phase === "idle" && (
        <ImageMouseTrail
          items={AD_EXAMPLES}
          maxNumberOfImages={5}
          distance={16}
          imgClass="w-44 h-28 sm:w-64 sm:h-40 rounded-xl object-cover shadow-ad ring-1 ring-white/10"
        />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />
        {s.phase === "idle" ? <Hero s={s} /> : <Workspace s={s} />}
      </div>
      <FortuneCookie />
    </div>
  );
}

/* ────────────────────────── idle: the hero ────────────────────────── */

function Hero({ s }: { s: IdleController }) {
  return (
    <section className="relative flex flex-1 flex-col justify-center overflow-hidden py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Static glow on mobile; the drifting-blob animation is desktop-only (GPU cost). */}
        <div className="absolute left-1/2 top-[-6rem] h-72 w-72 -translate-x-1/2 rounded-full bg-brand-purple/30 blur-[120px] sm:animate-blob" />
        <div className="absolute right-[8%] top-24 h-64 w-64 rounded-full bg-brand-purple/20 blur-[120px] sm:animate-blob [animation-delay:-6s]" />
        <div className="absolute left-[6%] top-40 h-56 w-56 rounded-full bg-brand-blue/20 blur-[120px] sm:animate-blob [animation-delay:-3s]" />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 text-center">
        <p className="mb-5 -skew-x-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground animate-fade-up">
          Pulls brand data from any site on the web
        </p>
        <h1 className="text-gradient text-4xl font-semibold leading-[1.05] tracking-tight animate-fade-up [animation-delay:60ms] min-[430px]:text-5xl sm:text-[4.25rem]">
          On-brand ads,
          <br />
          generated in seconds.
        </h1>
        <p className="mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-muted-foreground animate-fade-up [animation-delay:120ms]">
          Paste any domain. We pull the logo, colors, and style, then generate{" "}
          {AD_RUN_SIZE} ready-to-ship ad creatives with AI. No briefs, no
          settings — just a URL.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (s.domain.trim()) void s.start(s.domain);
          }}
          className="mt-8 w-full max-w-lg animate-fade-up [animation-delay:180ms]"
        >
          <div className="flex flex-col gap-2 rounded-2xl bg-card p-1.5 shadow-[0_8px_60px_-16px_rgba(112,0,255,0.55)] ring-1 ring-border backdrop-blur focus-within:ring-2 focus-within:ring-primary sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="pl-3 text-muted-foreground">
                <GlobeIcon />
              </span>
              <input
                type="text"
                value={s.domain}
                onChange={(e) => s.setDomain(e.target.value)}
                placeholder="Enter your brand URL, e.g. stripe.com"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!s.domain.trim()}
              className="btn-gradient w-full shrink-0 whitespace-nowrap sm:w-auto"
            >
              ✨ Generate {AD_RUN_SIZE} Ads
            </button>
          </div>
          {s.error && <p className="mt-2 text-xs text-red-500">{s.error}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            {EXAMPLE_DOMAINS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  s.setDomain(d);
                  void s.start(d);
                }}
                className="rounded-full bg-card px-2.5 py-1 font-medium text-muted-foreground ring-1 ring-border transition hover:bg-white/10 hover:text-foreground"
              >
                {d}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}

/* ─────────────── after submit: the same page, morphed ─────────────── */

const fmtElapsed = (secs: number) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

function Shimmer() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
    </span>
  );
}

function Workspace({ s }: { s: WorkspaceController }) {
  const cleanDomain = s.submittedDomain;
  const generating = s.phase === "generating";
  const total = AD_RUN_SIZE;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-5 py-8">
      <BrandBar s={s} cleanDomain={cleanDomain} />

      {(s.phase === "brief" || generating) && (
        <div className="animate-fade-up rounded-2xl border border-border bg-card px-4 py-3.5 [animation-delay:80ms]">
          <div className="flex items-center gap-3">
            <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground">
                {s.phase === "brief"
                  ? `Reading ${cleanDomain}…`
                  : `Painting ${total} on-brand ads`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {s.phase === "brief"
                  ? `Pulling the logo, palette, and voice, then picking ${AD_RUN_SIZE} creative directions`
                  : `Each ad lands the moment its model finishes · usually 1–3 min · keep this tab open`}
              </p>
            </div>
            {generating && (
              <div className="hidden shrink-0 items-center gap-3 sm:flex">
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                  {fmtElapsed(s.elapsed)}
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-brand-washed ring-1 ring-primary/30">
                  {s.doneCount}/{total}
                </span>
              </div>
            )}
          </div>
          {generating && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-purple transition-all duration-700"
                style={{
                  width: `${Math.max(6, (s.doneCount / total) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {s.phase !== "brief"
          ? s.slots.map((slot, i) => (
              <AdCard
                key={slot.concept.key}
                slot={slot}
                index={i}
                onRetry={() => s.retrySlot(i)}
                onDownload={() => s.downloadAd(i)}
              />
            ))
          : Array.from({ length: AD_RUN_SIZE }, (_, i) => (
              <div
                key={i}
                className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card"
                style={{ animationDelay: `${120 + i * 60}ms` }}
              >
                <div className="relative h-10 border-b border-border">
                  <Shimmer />
                </div>
                <div className="relative aspect-square">
                  <Shimmer />
                </div>
              </div>
            ))}
      </div>

      {s.phase === "done" && (
        <div className="animate-fade-up flex flex-col items-center gap-3 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {s.doneCount > 0 && (
              <button onClick={s.downloadAll} className="btn-dark">
                <DownloadIcon /> Download all {s.doneCount}
              </button>
            )}
            {s.doneCount > 0 && (
              <button
                onClick={() => void s.shareToX()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-black px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-zinc-800"
              >
                <XIcon /> Share on X
              </button>
            )}
            <button onClick={s.reset} className="btn-secondary text-[13px]">
              <RefreshIcon /> Try another brand
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Every ad is a 1:1 image — ready for feeds, decks, and campaigns.
          </p>
        </div>
      )}
    </main>
  );
}

function BrandBar({
  s,
  cleanDomain,
}: {
  s: WorkspaceController;
  cleanDomain: string;
}) {
  const b = s.phase === "brief" ? null : s.brief;
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-dark p-2 ring-1 ring-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              b?.logoUrl ??
              `https://www.google.com/s2/favicons?sz=64&domain=${cleanDomain}`
            }
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {b?.brandName ?? cleanDomain}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {b ? b.description || b.domain : "Extracting brand…"}
          </p>
        </div>

        {b && b.colors.length > 0 && (
          <div className="flex items-center -space-x-1 animate-fade-up">
            {b.colors.slice(0, 6).map((c, i) => (
              <span
                key={`${c.hex}-${i}`}
                className="size-5 rounded-full ring-2 ring-card"
                style={{ background: c.hex }}
                title={c.hex}
              />
            ))}
          </div>
        )}
        {b?.industry && (
          <span className="hidden items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-brand-washed ring-1 ring-primary/40 md:inline-flex">
            <BoltIcon /> {b.industry.split(" · ")[0]}
          </span>
        )}

        <button
          onClick={s.reset}
          aria-label="Start over"
          className="btn-secondary h-9 shrink-0 px-3 text-[12px]"
        >
          <RefreshIcon /> New brand
        </button>
      </div>
      {b?.mood && (
        <div className="border-t border-border px-4 py-2">
          <p className="truncate text-[11px] text-muted-foreground">
            <span className="font-semibold text-brand-washed">Visual mood</span>{" "}
            · {b.mood}
          </p>
        </div>
      )}
    </div>
  );
}

function AdCard({
  slot,
  index,
  onRetry,
  onDownload,
}: {
  slot: AdSlot;
  index: number;
  onRetry: () => void;
  onDownload: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const c = slot.concept;
  const directionLabel = directionByKey(c.key)?.label ?? c.key;
  const modelName = imageModelById(c.model)?.displayName ?? c.model;

  return (
    <div
      className="group animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {directionLabel}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            “{c.headline}”
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {modelName}
        </span>
      </div>

      <div className="relative aspect-square">
        {slot.status === "done" && slot.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.url}
              alt={`${directionLabel} ad`}
              onLoad={() => setLoaded(true)}
              className={`size-full object-cover transition-all duration-700 ${loaded ? "scale-100 opacity-100 blur-0" : "scale-[1.03] opacity-0 blur-md"}`}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              <button
                onClick={onDownload}
                className="btn-dark px-3 py-1.5 text-[12px]"
              >
                <DownloadIcon /> Download
              </button>
            </div>
          </>
        ) : slot.status === "error" ? (
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-white/[0.02] p-6 text-center">
            <p className="text-[13px] font-semibold text-foreground">
              This one didn&apos;t render
            </p>
            <p className="max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">
              The model hiccuped. Retry this slot without changing your other
              ads.
            </p>
            <button
              onClick={onRetry}
              className="btn-secondary px-3 py-1.5 text-[12px]"
            >
              <RefreshIcon /> Retry
            </button>
          </div>
        ) : (
          <div className="relative size-full">
            <Shimmer />
            <div className="absolute inset-0 grid place-items-center">
              <span className="size-5 animate-spin rounded-full border-2 border-primary/70 border-t-transparent" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
