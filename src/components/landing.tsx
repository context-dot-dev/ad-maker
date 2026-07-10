"use client";

import ImageMouseTrail from "@/components/ui/mousetrail";
import { Header, FortuneCookie } from "@/components/site-header";
import { WarpedMarquee } from "@/components/warped-marquee";
import { GlobeIcon } from "@/components/icons";
import { AD_EXAMPLES, EXAMPLE_DOMAINS } from "@/lib/constants";
import type { StudioController } from "@/hooks/use-studio";

export function Landing({ s }: { s: StudioController }) {
  const { url, setUrl, loadBrand, loadingBrand, brandError } = s;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background font-sans antialiased">
      <ImageMouseTrail
        items={AD_EXAMPLES}
        maxNumberOfImages={5}
        distance={16}
        imgClass="w-44 h-28 sm:w-64 sm:h-40 rounded-xl object-cover shadow-ad ring-1 ring-white/10"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <Header />

        <section className="relative flex flex-1 flex-col justify-center overflow-hidden py-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-[-6rem] h-72 w-72 -translate-x-1/2 rounded-full bg-brand-purple/30 blur-[120px] animate-blob" />
            <div className="absolute right-[8%] top-24 h-64 w-64 rounded-full bg-brand-purple/20 blur-[120px] animate-blob [animation-delay:-6s]" />
            <div className="absolute left-[6%] top-40 h-56 w-56 rounded-full bg-brand-blue/20 blur-[120px] animate-blob [animation-delay:-3s]" />
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 text-center">
            <p className="mb-5 -skew-x-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground animate-fade-up">
              Pulls brand data from any site on the web
            </p>
            <h1 className="text-gradient text-5xl font-semibold leading-[1.05] tracking-tight animate-fade-up [animation-delay:60ms] sm:text-[4.25rem]">
              On-brand ads,<br />generated in seconds.
            </h1>
            <p className="mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-muted-foreground animate-fade-up [animation-delay:120ms]">
              Paste any brand URL. We pull the logo, colors, and style — then generate ready-to-ship ad creatives with AI.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) void loadBrand(url); }} className="mt-8 w-full max-w-lg animate-fade-up [animation-delay:180ms]">
              <div className="flex items-center gap-2 rounded-2xl bg-card p-1.5 shadow-[0_8px_60px_-16px_rgba(112,0,255,0.55)] ring-1 ring-border backdrop-blur focus-within:ring-2 focus-within:ring-primary">
                <span className="pl-3 text-muted-foreground"><GlobeIcon /></span>
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter your brand URL — e.g. stripe.com" className="flex-1 bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" disabled={loadingBrand} />
                <button type="submit" disabled={loadingBrand || !url.trim()} className="btn-gradient shrink-0 whitespace-nowrap">
                  {loadingBrand ? <span className="flex items-center gap-2"><span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Reading…</span> : <>✨ Generate Ads</>}
                </button>
              </div>
              {brandError && <p className="mt-2 text-xs text-red-600">{brandError}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Try:</span>
                {EXAMPLE_DOMAINS.map((d) => (
                  <button key={d} type="button" onClick={() => { setUrl(d); void loadBrand(d); }} className="rounded-full bg-card px-2.5 py-1 font-medium text-muted-foreground ring-1 ring-border transition hover:bg-white/10 hover:text-foreground">{d}</button>
                ))}
              </div>
            </form>
          </div>

          <div className="relative mt-12 sm:mt-14">
            <WarpedMarquee />
          </div>
        </section>
      </div>
      <FortuneCookie />
    </div>
  );
}
