"use client";

import { useState } from "react";
import { Header, FortuneCookie } from "@/components/site-header";
import { BrandFlex } from "@/components/brand-flex";
import { AdCanvas } from "@/components/ad-canvas";
import { ShareSheet } from "@/components/share-sheet";
import { CheckIcon, ChevronDown, DownloadIcon, LockIcon, RefreshIcon, XIcon } from "@/components/icons";
import { FORMATS, STYLES, formatMeta } from "@/lib/formats";
import type { StyleId } from "@/lib/types";
import { buildShareCaption, type StudioController } from "@/hooks/use-studio";

const shapeWidth = (ratio: number) => (ratio >= 2 ? "86%" : ratio > 1 ? "80%" : "58%");

export function Studio({ s }: { s: StudioController }) {
  const {
    url, setUrl, loadBrand, loadingBrand, brandError, activeBrand: b,
    selectedFormats, toggleFormat, orderedFormats,
    mainMessage, setMainMessage, subMessage, setSubMessage,
    style, setStyle, advancedOpen, setAdvancedOpen,
    ctaOverride, setCtaOverride, textFree, setTextFree,
    results, isGenerating, genError, chosen, allChosen,
    shared, shareHint,
    generate, toggleChosen, toggleSelectAll, registerCanvas, downloadImage, downloadAll, shareToX, getAdDataUrl,
  } = s;

  const [shareOpen, setShareOpen] = useState(false);
  const shareIdx = chosen.size > 0 ? Math.min(...chosen) : 0;

  return (
    <div className="min-h-dvh font-sans antialiased">
      <Header />

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <BrandFlex brand={b} url={url} setUrl={setUrl} onLoad={() => url.trim() && void loadBrand(url)} loading={loadingBrand} />
        {brandError && <p className="text-xs text-red-600">{brandError}</p>}

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Formats</p>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-brand-washed ring-1 ring-primary/30">{selectedFormats.length}/3</span>
              </div>
              <p className="mb-3.5 text-[12px] leading-relaxed text-muted-foreground">Pick up to 3 — one distinct on-brand ad per format.</p>
              <div className="space-y-2">
                {FORMATS.map((f) => {
                  const isSel = selectedFormats.includes(f.id);
                  const disabled = !isSel && selectedFormats.length >= 3;
                  return (
                    <button key={f.id} onClick={() => toggleFormat(f.id)} disabled={disabled}
                      className={`flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition ${isSel ? "border-primary bg-primary/10" : "border-border bg-white/[0.02] hover:border-primary/40"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}>
                      <span className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-muted/60 ring-1 ring-inset ring-border">
                        <span className={`rounded-[3px] transition ${isSel ? "bg-gradient-to-br from-brand-blue to-brand-purple" : "bg-muted-foreground/40"}`} style={{ aspectRatio: String(f.ratio), width: shapeWidth(f.ratio) }} />
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[13px] font-semibold text-foreground">{f.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{f.dims} · {f.note}</p>
                      </div>
                      <span className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${isSel ? "border-primary bg-primary text-white" : "border-border text-transparent"}`}><CheckIcon className="size-3" /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-4 text-sm font-semibold text-foreground">Customize <span className="font-normal text-muted-foreground">(optional)</span></p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Main message</label>
                  <input type="text" value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} placeholder="Leave blank to let AI write it" className="input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Sub message <span className="text-muted-foreground">(optional)</span></label>
                  <input type="text" value={subMessage} onChange={(e) => setSubMessage(e.target.value)} placeholder="Scale globally. Start locally." className="input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Style</label>
                  <div className="relative">
                    <select value={style} onChange={(e) => setStyle(e.target.value as StyleId)} className="input cursor-pointer appearance-none pr-9">
                      {STYLES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <button type="button" onClick={() => setTextFree((v) => !v)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.02] p-3 text-left transition hover:border-primary/50">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground">Artwork only</span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">Pure campaign visuals, no text or logo</span>
                  </span>
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${textFree ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${textFree ? "left-[1.125rem]" : "left-0.5"}`} />
                  </span>
                </button>

                <div className="border-t border-border pt-4">
                  <button onClick={() => setAdvancedOpen((v) => !v)} className="flex w-full items-center justify-between text-[13px] font-semibold text-muted-foreground">
                    Advanced options<ChevronDown className={`size-4 text-muted-foreground transition ${advancedOpen ? "rotate-180" : ""}`} />
                  </button>
                  {advancedOpen && (
                    <div className="mt-4">
                      <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Custom call-to-action</label>
                      <input type="text" value={ctaOverride} onChange={(e) => setCtaOverride(e.target.value)} placeholder="e.g. Start free trial" className="input" disabled={textFree} />
                    </div>
                  )}
                </div>
                <button onClick={() => void generate()} disabled={isGenerating || selectedFormats.length === 0} className="btn-dark w-full">
                  {isGenerating ? <span className="flex items-center gap-2"><span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Generating…</span> : <>✨ Generate {selectedFormats.length} ad{selectedFormats.length === 1 ? "" : "s"}</>}
                </button>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">Generated ads</p>
                <p className="text-[13px] text-muted-foreground">Real AI creatives — on your brand, ready to ship.</p>
              </div>
              {results.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={toggleSelectAll} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${allChosen ? "border-primary bg-primary/15 text-brand-washed" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                    <span className={`grid size-4 place-items-center rounded-[5px] ${allChosen ? "bg-primary text-white" : "border border-current"}`}>{allChosen && <CheckIcon className="size-2.5" />}</span>
                    Select all
                  </button>
                  <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-black px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-zinc-800"><XIcon /> Share on X</button>
                  <button
                    onClick={downloadAll}
                    disabled={!shared}
                    title={shared ? "" : "Share on X to unlock downloads"}
                    className="btn-dark px-3 py-1.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {shared ? <DownloadIcon /> : <LockIcon className="size-3.5" />} {chosen.size > 0 ? `Download ${chosen.size}` : "Download all"}
                  </button>
                </div>
              )}
            </div>

            {results.length === 0 && !isGenerating && (
              <div className="rounded-2xl border border-dashed border-border bg-white/[0.01] p-5">
                <div className="space-y-2.5">
                  {orderedFormats.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/[0.02] px-3.5 py-3">
                      <span className="grid h-9 w-12 shrink-0 place-items-center rounded-md bg-muted/60 ring-1 ring-inset ring-border">
                        <span className="rounded-[3px] bg-muted-foreground/30" style={{ aspectRatio: String(f.ratio), width: shapeWidth(f.ratio) }} />
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[13px] font-semibold text-foreground">{f.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{f.dims} · {f.note}</p>
                      </div>
                      <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Queued</span>
                    </div>
                  ))}
                  {orderedFormats.length === 0 && (
                    <p className="py-8 text-center text-[13px] text-muted-foreground">Pick at least one format on the left to begin.</p>
                  )}
                </div>

                <div className="mt-5 flex flex-col items-center gap-3 border-t border-border pt-5 text-center">
                  <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                    {orderedFormats.length > 0 ? (
                      <>Ready when you are — we&apos;ll craft {orderedFormats.length} distinct, on-brand ad{orderedFormats.length === 1 ? "" : "s"} for <span className="font-semibold text-foreground">{b.name ?? b.domain}</span>.</>
                    ) : (
                      "Choose your formats and hit generate."
                    )}
                  </p>
                  <button onClick={() => void generate()} disabled={selectedFormats.length === 0} className="btn-dark">✨ Generate {selectedFormats.length} ad{selectedFormats.length === 1 ? "" : "s"}</button>
                  {genError && <p className="text-xs text-red-500">{genError}</p>}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Generating your ad{orderedFormats.length === 1 ? "" : "s"}</p>
                    <p className="text-[11px] text-muted-foreground">Rendering {orderedFormats.length} on-brand creative{orderedFormats.length === 1 ? "" : "s"} · usually 20–40s</p>
                  </div>
                </div>
                {orderedFormats.map((f) => (
                  <div key={f.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                      <span className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">{f.icon}</span>
                      <p className="text-[13px] font-semibold text-foreground">{f.label}</p>
                      <span className="text-[11px] text-muted-foreground">{f.dims}</span>
                    </div>
                    <div className="p-4">
                      <div className={`mx-auto w-full ${f.id === "li_post" ? "max-w-[420px]" : f.ratio >= 2 ? "max-w-full" : "max-w-[640px]"} overflow-hidden rounded-lg bg-gradient-to-br from-white/[0.07] to-white/[0.02]`} style={{ aspectRatio: String(f.ratio) }}>
                        <div className="size-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.length > 0 && !isGenerating && (
              <div className="space-y-5">
                {results.map((r, i) => {
                  const f = formatMeta(r.format);
                  const isChosen = chosen.has(i);
                  const maxW = r.format === "li_post" ? "max-w-[420px]" : f.ratio >= 2 ? "max-w-full" : "max-w-[640px]";
                  return (
                    <div key={i} className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-card" style={{ animationDelay: `${i * 70}ms` }}>
                      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">{f.icon}</span>
                          <p className="truncate text-[13px] font-semibold text-foreground">{f.label}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{f.w} × {f.h}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button onClick={() => toggleChosen(i)} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition ${isChosen ? "border-primary bg-primary/15 text-brand-washed" : "border-border bg-white/[0.02] text-muted-foreground hover:text-foreground"}`}>
                            <span className={`grid size-4 place-items-center rounded-full ${isChosen ? "bg-primary text-white" : "border border-current"}`}>{isChosen && <CheckIcon className="size-2.5" />}</span>
                            {isChosen ? "Selected" : "Select"}
                          </button>
                          <button
                            onClick={() => downloadImage(r, i)}
                            disabled={!shared}
                            title={shared ? "" : "Share on X to unlock downloads"}
                            className="btn-secondary px-2.5 py-1.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {shared ? <DownloadIcon /> : <LockIcon className="size-3.5" />} Download
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className={`group relative mx-auto w-full ${maxW} overflow-hidden rounded-lg ring-1 ring-border`}>
                          <AdCanvas index={i} r={r} fmt={f} brand={b} register={registerCanvas} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {genError && <p className="text-xs text-red-500">{genError}</p>}

                {!shared && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-4 py-4 text-center">
                    <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <LockIcon className="size-3.5" /> Share your ads on X to unlock downloads
                    </p>
                    <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-black px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800"><XIcon /> Share on X</button>
                    <p className="text-[11px] text-muted-foreground">We tag <span className="font-medium text-brand-washed">@getcontextdev</span> and attach your ad automatically.</p>
                  </div>
                )}

                <div className="flex justify-center gap-3 pt-1">
                  <button onClick={() => void generate()} disabled={isGenerating} className="btn-secondary text-[13px]"><RefreshIcon /> Regenerate</button>
                  {shared && (
                    <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-black px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800"><XIcon /> Share on X</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {shareOpen && results[shareIdx] && (
        <ShareSheet
          brand={b}
          dataUrl={getAdDataUrl(shareIdx)}
          ratio={formatMeta(results[shareIdx].format).ratio}
          caption={buildShareCaption(b.domain)}
          onShare={shareToX}
          onClose={() => setShareOpen(false)}
        />
      )}

      {shareHint && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full border border-border bg-black px-4 py-2.5 text-[13px] font-medium text-white shadow-ad">
          {shareHint}
        </div>
      )}

      <FortuneCookie />
    </div>
  );
}
