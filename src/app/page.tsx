"use client";

import { useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BrandAssets = {
  domain: string;
  name: string | null;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  colors: string[];
};

type Ad = { headline: string; highlight: string; body: string; cta: string };

type FormatId = "x_banner" | "li_post" | "li_banner" | "ad_16_9" | "custom";
type StyleId = "clean" | "bold" | "minimal" | "playful" | "elegant";

// ── Constants ─────────────────────────────────────────────────────────────────

const FORMATS: {
  id: FormatId;
  label: string;
  dims: string;
  ratio: number;
  icon: React.ReactNode;
}[] = [
  { id: "x_banner", label: "X (Twitter) Banner", dims: "1200 × 600",  ratio: 1200 / 600,  icon: <XIcon /> },
  { id: "li_post",  label: "LinkedIn Post",      dims: "1200 × 628",  ratio: 1200 / 628,  icon: <LinkedInIcon /> },
  { id: "li_banner",label: "LinkedIn Banner",    dims: "1584 × 396",  ratio: 1584 / 396,  icon: <ImageIcon /> },
  { id: "ad_16_9",  label: "Ad Image (16:9)",    dims: "1200 × 675",  ratio: 16 / 9,      icon: <ImageIcon /> },
  { id: "custom",   label: "Custom Size",        dims: "Set dimensions", ratio: 16 / 9,   icon: <FrameIcon /> },
];

const STYLES: { id: StyleId; label: string }[] = [
  { id: "clean",   label: "Clean" },
  { id: "bold",    label: "Bold" },
  { id: "minimal", label: "Minimal" },
  { id: "playful", label: "Playful" },
  { id: "elegant", label: "Elegant" },
];

const DEMO_AD: Ad = {
  headline: "Ship features faster with real-time web data.",
  highlight: "real-time",
  body: "",
  cta: "acme.com",
};

const DEMO_BRAND: BrandAssets = {
  domain: "acme.com",
  name: "ACME",
  description: null,
  logoUrl: null,
  primaryColor: "#3730a3",
  colors: [],
};

// ── Ad Visual (the rendered ad) ───────────────────────────────────────────────

function AdVisual({
  brand,
  ad,
  ratio,
  className,
}: {
  brand: BrandAssets;
  ad: Ad;
  ratio: number;
  className?: string;
}) {
  const base = brand.primaryColor ?? "#3730a3";
  const gradient = `linear-gradient(135deg, ${base} 0%, ${mix(base, "#141235", 0.55)} 100%)`;

  const headlineNode = ad.highlight && ad.headline.includes(ad.highlight)
    ? (() => {
        const [before, after] = ad.headline.split(ad.highlight);
        return (
          <>
            {before}
            <span style={{ color: lighten(base) }}>{ad.highlight}</span>
            {after}
          </>
        );
      })()
    : ad.headline;

  return (
    <div
      className={`relative overflow-hidden text-white ${className ?? ""}`}
      style={{ aspectRatio: String(ratio), background: gradient }}
    >
      <GlobeGraphic />
      <div className="relative flex h-full flex-col justify-between p-[5%]">
        {/* Brand row */}
        <div className="flex items-center gap-2">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="size-[1.6em] rounded-md object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <span className="grid size-[1.6em] place-items-center rounded-md bg-white/15 text-[0.7em] font-bold">
              {(brand.name ?? "A")[0]}
            </span>
          )}
          <span className="text-[0.72em] font-semibold tracking-tight opacity-90">
            {brand.name ?? brand.domain}
          </span>
        </div>

        {/* Headline */}
        <p
          className="max-w-[85%] font-semibold leading-[1.12] tracking-tight"
          style={{ fontSize: "clamp(0.95rem, 3.1vw, 1.9rem)" }}
        >
          {ad.headline ? headlineNode : (
            <span className="inline-block h-3 w-3/4 animate-pulse rounded bg-white/20" />
          )}
        </p>

        {/* Footer row */}
        <div className="flex items-end justify-between gap-2">
          <span className="rounded-md bg-white/12 px-[0.8em] py-[0.45em] text-[0.6em] font-semibold backdrop-blur-sm">
            {ad.cta || brand.domain}
          </span>
          {ad.body && <span className="max-w-[45%] text-right text-[0.55em] leading-snug opacity-60">{ad.body}</span>}
        </div>
      </div>
    </div>
  );
}

function GlobeGraphic() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-8 top-1/2 h-[150%] w-auto -translate-y-1/2 opacity-[0.18]"
      fill="none"
      stroke="white"
      strokeWidth="0.6"
    >
      <circle cx="100" cy="100" r="80" />
      <circle cx="100" cy="100" r="80" strokeWidth="0.4" />
      <ellipse cx="100" cy="100" rx="80" ry="30" />
      <ellipse cx="100" cy="100" rx="80" ry="55" />
      <ellipse cx="100" cy="100" rx="30" ry="80" />
      <ellipse cx="100" cy="100" rx="55" ry="80" />
      <line x1="20" y1="100" x2="180" y2="100" />
      <line x1="100" y1="20" x2="100" y2="180" />
    </svg>
  );
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function mix(a: string, b: string, t: number) {
  try {
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  } catch {
    return a;
  }
}
function lighten(hex: string) {
  return mix(hex, "#ffffff", 0.55);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  // URL / brand
  const [url, setUrl] = useState("");
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandAssets | null>(null);
  const [pageMarkdown, setPageMarkdown] = useState("");

  // Customize
  const [format, setFormat] = useState<FormatId>("x_banner");
  const [promoting, setPromoting] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [style, setStyle] = useState<StyleId>("clean");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ctaOverride, setCtaOverride] = useState("");

  // Results
  const [ads, setAds] = useState<Ad[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "favorites">("all");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [previewIndex, setPreviewIndex] = useState(0);

  const customizeRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const activeBrand = brand ?? DEMO_BRAND;
  const activeFormat = FORMATS.find((f) => f.id === format)!;
  const previewAd = ads[previewIndex] ?? DEMO_AD;

  // ── fetch brand ──
  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBrandError(null);
    setLoadingBrand(true);
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = `https://${cleanUrl}`;
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = (await res.json()) as { brand: BrandAssets | null; pageMarkdown: string; error: string | null };
      if (!res.ok || (!data.brand && data.error)) {
        setBrandError(data.error ?? "Couldn't read that site. Try another URL.");
        if (!data.brand) return;
      }
      setBrand(data.brand);
      setPageMarkdown(data.pageMarkdown ?? "");
      setTimeout(() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch {
      setBrandError("Network error. Check the URL and try again.");
    } finally {
      setLoadingBrand(false);
    }
  }

  // ── generate ──
  const generate = useCallback(
    async (append = false) => {
      const b = brand ?? DEMO_BRAND;
      setGenError(null);
      setIsGenerating(true);
      if (!append) {
        setAds([]);
        setPreviewIndex(0);
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: b.domain,
            brandName: b.name ?? b.domain,
            description: b.description ?? "",
            pageMarkdown,
            promoting,
            keyMessage,
            ctaOverride,
            style,
            format,
            count: 3,
          }),
        });
        const data = (await res.json()) as { ads?: Ad[]; error?: string };
        if (!res.ok || !data.ads) {
          setGenError(data.error ?? "Generation failed. Try again.");
          return;
        }
        setAds((prev) => (append ? [...prev, ...data.ads!] : data.ads!));
      } catch {
        setGenError("Generation failed. Try again.");
      } finally {
        setIsGenerating(false);
      }
    },
    [brand, pageMarkdown, promoting, keyMessage, ctaOverride, style, format],
  );

  function toggleFavorite(i: number) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const hasBrand = brand !== null;
  const accent = brand?.primaryColor ?? "#4b46e5";
  const visibleAds = tab === "favorites" ? ads.filter((_, i) => favorites.has(i)) : ads;

  return (
    <div className="min-h-dvh font-sans antialiased">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-neutral-900/6 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-neutral-900 text-[11px] font-bold text-white">C</span>
            <span className="text-[15px] font-semibold tracking-tight">Context.dev</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <span className="flex items-center gap-1.5 font-medium text-brand-600">
              Ad Maker
              <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Pro</span>
            </span>
            <a href="https://context.dev" className="text-neutral-500 hover:text-neutral-900">API</a>
            <a href="https://context.dev/docs" className="text-neutral-500 hover:text-neutral-900">Docs</a>
            <a href="https://context.dev/pricing" className="text-neutral-500 hover:text-neutral-900">Pricing</a>
            <a href="https://context.dev/blog" className="text-neutral-500 hover:text-neutral-900">Blog</a>
          </nav>
          <a href="https://context.dev" className="btn-dark text-[13px]">Go to Dashboard</a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-8 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-900/8 bg-white px-2.5 py-1 text-xs text-neutral-500">
              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>
              Demo Ad Maker
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[3.25rem]">
              Create on-brand ads
              <br />
              in <span style={{ color: accent }}>seconds.</span>
            </h1>
            <p className="mt-4 max-w-[40ch] text-[15px] text-neutral-500">
              Paste your brand URL. Pick a format. Get beautiful, on-brand ads instantly.
            </p>

            <form onSubmit={handleUrlSubmit} className="mt-7 max-w-md">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter your brand URL (e.g. stripe.com)"
                  className="input flex-1"
                  disabled={loadingBrand}
                />
                <button type="submit" disabled={loadingBrand || !url.trim()} className="btn-dark shrink-0 whitespace-nowrap">
                  {loadingBrand ? (
                    <span className="flex items-center gap-2">
                      <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Reading…
                    </span>
                  ) : (
                    <>Generate Ads →</>
                  )}
                </button>
              </div>
              {brandError && <p className="mt-2 text-xs text-red-600">{brandError}</p>}
              <p className="mt-2.5 text-xs text-neutral-400">No credit card required · Free to try</p>
            </form>
          </div>

          {/* Right — preview card */}
          <div className="lg:pl-6">
            <div className="rounded-2xl border border-neutral-900/8 bg-neutral-50 p-3 shadow-soft">
              <AdVisual brand={activeBrand} ad={previewAd} ratio={activeFormat.ratio} className="rounded-xl shadow-ad" />
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    aria-label={f.label}
                    className={`h-1.5 rounded-full transition-all ${format === f.id ? "w-5 bg-neutral-800" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"}`}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-neutral-400">
                <span className="font-medium text-neutral-500">{activeFormat.label}</span>
                <span>{activeFormat.dims}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="section-title">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { n: 1, icon: <GlobeIcon />, title: "Add your brand URL", desc: "We pull your logo, colors, fonts, and style guide automatically." },
            { n: 2, icon: <SlidersIcon />, title: "Choose what you want", desc: "Pick a format and tell us what to promote." },
            { n: 3, icon: <SparkleIcon />, title: "Generate & download", desc: "Get multiple on-brand variations in seconds." },
          ].map((s, i) => (
            <div key={s.n} className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 ring-1 ring-brand-100">{s.n}</span>
                <span className="text-neutral-400">{s.icon}</span>
              </div>
              <p className="text-sm font-semibold text-neutral-900">{s.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{s.desc}</p>
              {i < 2 && <span className="absolute -right-3 top-3 hidden text-neutral-300 sm:block">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Pick a format ── */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="section-title">Pick a format</h2>
        <p className="section-sub">Perfect for social, ads, and announcements.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition ${
                format === f.id
                  ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500"
                  : "border-neutral-900/10 bg-white hover:border-neutral-900/20 hover:bg-neutral-50"
              }`}
            >
              <span className={`grid size-9 place-items-center rounded-lg ${format === f.id ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-700"}`}>
                {f.icon}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-neutral-900">{f.label}</p>
                <p className="text-[11px] text-neutral-400">{f.dims}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Customize your ad ── */}
      <section ref={customizeRef} className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="section-title">Customize your ad</h2>
        <p className="section-sub">Add your message and we&apos;ll handle the rest.</p>

        <div className="mt-8 grid gap-8 rounded-2xl border border-neutral-900/8 bg-white p-6 shadow-card lg:grid-cols-2 lg:p-8">
          {/* Form */}
          <div className="space-y-6">
            {/* Promoting */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-semibold text-neutral-800">What are you promoting?</label>
                <span className="text-[11px] text-neutral-300">{promoting.length}/80</span>
              </div>
              <input
                type="text"
                value={promoting}
                maxLength={80}
                onChange={(e) => setPromoting(e.target.value)}
                placeholder="e.g. New product launch, Blog post, Webinar…"
                className="input"
              />
            </div>

            {/* Key message */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-semibold text-neutral-800">Key message <span className="font-normal text-neutral-400">(optional)</span></label>
                <span className="text-[11px] text-neutral-300">{keyMessage.length}/150</span>
              </div>
              <textarea
                value={keyMessage}
                maxLength={150}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="Add any key details or offer…"
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Style */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-neutral-800">Style</label>
              <div className="relative">
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as StyleId)}
                  className="input cursor-pointer appearance-none pr-9"
                >
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-400">We&apos;ll match your visual style automatically.</p>
            </div>

            {/* Advanced */}
            <div className="border-t border-neutral-900/6 pt-4">
              <button
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between text-[13px] font-semibold text-neutral-700"
              >
                Advanced options
                <ChevronDown className={`size-4 text-neutral-400 transition ${advancedOpen ? "rotate-180" : ""}`} />
              </button>
              {advancedOpen && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-[13px] font-medium text-neutral-700">Custom call-to-action <span className="font-normal text-neutral-400">(optional)</span></label>
                  <input
                    type="text"
                    value={ctaOverride}
                    onChange={(e) => setCtaOverride(e.target.value)}
                    placeholder="e.g. Start free trial"
                    className="input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="mb-3 text-[13px] font-semibold text-neutral-800">Preview</p>
            <AdVisual brand={activeBrand} ad={previewAd} ratio={activeFormat.ratio} className="rounded-xl shadow-ad" />
            <div className="mt-4 flex items-center justify-center gap-3 text-neutral-400">
              <button
                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                disabled={previewIndex === 0}
                className="grid size-7 place-items-center rounded-full ring-1 ring-neutral-900/10 disabled:opacity-40 hover:bg-neutral-50"
              >←</button>
              <span className="text-xs text-neutral-500">{Math.min(previewIndex + 1, Math.max(ads.length, 1))} / {Math.max(ads.length, 1)}</span>
              <button
                onClick={() => setPreviewIndex((i) => Math.min(Math.max(ads.length - 1, 0), i + 1))}
                disabled={previewIndex >= ads.length - 1}
                className="grid size-7 place-items-center rounded-full ring-1 ring-neutral-900/10 disabled:opacity-40 hover:bg-neutral-50"
              >→</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ready to generate band ── */}
      <section className="mx-auto max-w-5xl px-5 py-4">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-band px-6 py-5 sm:flex-row">
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-600 shadow-xs">
              <SparkleIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Ready to generate your ad?</p>
              <p className="text-[13px] text-neutral-500">We&apos;ll create multiple variations and handle the design for you.</p>
            </div>
          </div>
          <button onClick={() => void generate(false)} disabled={isGenerating} className="btn-dark shrink-0">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating…
              </span>
            ) : (
              <>Generate Ads →</>
            )}
          </button>
        </div>
        {!hasBrand && (
          <p className="mt-2 text-center text-[11px] text-neutral-400">
            Tip: add your brand URL above for logo &amp; colors — or generate with the demo brand.
          </p>
        )}
        {genError && <p className="mt-2 text-center text-xs text-red-600">{genError}</p>}
      </section>

      {/* ── Your generated ads ── */}
      {(ads.length > 0 || isGenerating) && (
        <section ref={resultsRef} className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="section-title">Your generated ads</h2>
          <p className="section-sub">Download your favorites.</p>

          {/* Tabs */}
          <div className="mt-8 flex items-center justify-between border-b border-neutral-900/8">
            <div className="flex gap-6">
              <button
                onClick={() => setTab("all")}
                className={`-mb-px border-b-2 pb-2.5 text-sm font-medium transition ${tab === "all" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}
              >
                All ({ads.length})
              </button>
              <button
                onClick={() => setTab("favorites")}
                className={`-mb-px border-b-2 pb-2.5 text-sm font-medium transition ${tab === "favorites" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}
              >
                Favorites ({favorites.size})
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isGenerating && ads.length === 0
              ? [0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="rounded-xl bg-neutral-100" style={{ aspectRatio: String(activeFormat.ratio) }} />
                    <div className="mt-2 h-9 rounded-lg bg-neutral-100" />
                  </div>
                ))
              : visibleAds.map((ad, i) => {
                  const realIndex = tab === "favorites" ? ads.indexOf(ad) : i;
                  return (
                    <div key={realIndex} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                      <AdVisual brand={activeBrand} ad={ad} ratio={activeFormat.ratio} className="rounded-xl shadow-ad" />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => downloadAd(activeBrand, ad, activeFormat)}
                          className="btn-secondary flex-1 text-[13px]"
                        >
                          <DownloadIcon /> Download
                        </button>
                        <button
                          onClick={() => toggleFavorite(realIndex)}
                          aria-label="Favorite"
                          className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 transition ${
                            favorites.has(realIndex)
                              ? "bg-brand-50 text-brand-600 ring-brand-200"
                              : "bg-white text-neutral-400 ring-neutral-900/10 hover:text-neutral-700"
                          }`}
                        >
                          <BookmarkIcon filled={favorites.has(realIndex)} />
                        </button>
                      </div>
                    </div>
                  );
                })}
          </div>

          {tab === "favorites" && favorites.size === 0 && !isGenerating && (
            <p className="mt-8 text-center text-sm text-neutral-400">No favorites yet — tap the bookmark on any ad.</p>
          )}

          {/* Load more */}
          {ads.length > 0 && (
            <div className="mt-10 flex justify-center">
              <button onClick={() => void generate(true)} disabled={isGenerating} className="btn-secondary">
                <RefreshIcon /> Load more variations
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Powered by band ── */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-6 rounded-2xl bg-band px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Powered by the Context.dev Brand API</p>
            <p className="mt-0.5 text-[13px] text-neutral-500">The same brand data trusted by thousands of AI agents and products.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            {[
              { icon: <GlobeIcon />, label: "Logos" },
              { icon: <ColorIcon />, label: "Colors" },
              { icon: <FontIcon />, label: "Fonts" },
              { icon: <BookIcon />, label: "Style guide" },
            ].map((x) => (
              <div key={x.label} className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <span className="text-brand-600">{x.icon}</span>
                {x.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-900/8 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-neutral-900 text-[11px] font-bold text-white">C</span>
                <span className="text-[15px] font-semibold tracking-tight">Context.dev</span>
              </div>
              <p className="mt-3 max-w-xs text-[13px] text-neutral-500">The #1 API to give AI agents context.</p>
            </div>
            {[
              { title: "Product", links: ["Ad Maker", "API", "Docs", "Pricing"] },
              { title: "Company", links: ["Blog", "Changelog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l}><a href="https://context.dev" className="text-[13px] text-neutral-600 hover:text-neutral-900">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-neutral-900/6 pt-6 sm:flex-row">
            <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Context.dev, Inc.</p>
            <div className="flex items-center gap-3 text-neutral-400">
              <span className="text-xs font-medium text-neutral-500">Follow</span>
              <a href="https://x.com/context_dev" aria-label="X" className="hover:text-neutral-900"><XIcon /></a>
              <a href="https://linkedin.com" aria-label="LinkedIn" className="hover:text-neutral-900"><LinkedInIcon /></a>
              <a href="https://github.com" aria-label="GitHub" className="hover:text-neutral-900"><GitHubIcon /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Canvas download ───────────────────────────────────────────────────────────

function downloadAd(brand: BrandAssets, ad: Ad, format: { id: FormatId; label: string; ratio: number }) {
  const W = 1200;
  const H = Math.round(W / format.ratio);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const base = brand.primaryColor ?? "#3730a3";
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, base);
  grad.addColorStop(1, mix(base, "#141235", 0.55));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // globe rings
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  const cx = W * 0.86, cy = H * 0.5, r = H * 0.6;
  for (const rx of [r, r * 0.68, r * 0.38]) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, r, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  const pad = W * 0.05;
  // brand
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `600 ${Math.round(H * 0.05)}px Inter, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(brand.name ?? brand.domain, pad, pad);

  // headline (word wrap)
  ctx.fillStyle = "#ffffff";
  const fontSize = Math.round(H * 0.11);
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  const words = ad.headline.split(" ");
  const maxW = W * 0.8;
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  const lineH = fontSize * 1.15;
  let y = cy - (lines.length * lineH) / 2;
  for (const l of lines) { ctx.fillText(l, pad, y); y += lineH; }

  // cta pill
  const ctaText = ad.cta || brand.domain;
  const ctaFont = Math.round(H * 0.045);
  ctx.font = `600 ${ctaFont}px Inter, sans-serif`;
  const tw = ctx.measureText(ctaText).width;
  const px = ctaFont * 0.9, py = ctaFont * 0.6;
  const bx = pad, by = H - pad - (ctaFont + py * 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, bx, by, tw + px * 2, ctaFont + py * 2, 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(ctaText, bx + px, by + py);

  const link = document.createElement("a");
  link.download = `${(brand.name ?? brand.domain).replace(/\W+/g, "-").toLowerCase()}-${format.id}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="size-[1em] w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>; }
function LinkedInIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>; }
function GitHubIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>; }
function ImageIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>; }
function FrameIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" className="size-5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>; }
function GlobeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>; }
function SlidersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="2" fill="currentColor" stroke="none"/></svg>; }
function SparkleIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M12 2l1.6 4.9L18.5 8.5l-4.9 1.6L12 15l-1.6-4.9L5.5 8.5l4.9-1.6z"/></svg>; }
function ChevronDown({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? "size-4"}><path d="m6 9 6 6 6-6"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>; }
function BookmarkIcon({ filled }: { filled: boolean }) { return <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M6 4h12v16l-6-4-6 4z"/></svg>; }
function RefreshIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>; }
function ColorIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="13" r="1.3" fill="currentColor" stroke="none"/></svg>; }
function FontIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M5 20 12 4l7 16M7.5 14h9"/></svg>; }
function BookIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>; }
