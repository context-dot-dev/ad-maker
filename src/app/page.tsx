"use client";

import { useState, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BrandColor = { hex: string; name: string | null };
type BrandImage = { url: string };

type BrandAssets = {
  domain: string;
  name: string | null;
  description: string | null;
  slogan: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  darkColor: string | null;
  colors: BrandColor[];
  logos: BrandImage[];
  backdrops: BrandImage[];
  socials: number;
  creditsConsumed: number | null;
  creditsRemaining: number | null;
};

type Ad = { headline: string; highlight: string; body: string; cta: string };
type Variant = "primary" | "dark" | "light";

type FormatId = "x_banner" | "li_post" | "li_banner" | "ad_16_9";
type StyleId = "clean" | "bold" | "minimal" | "playful" | "elegant";
type Result = { format: FormatId; url: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const FORMATS: { id: FormatId; label: string; dims: string; ratio: number; w: number; h: number; icon: React.ReactNode }[] = [
  { id: "x_banner",  label: "X Banner",        dims: "1500 × 500",  ratio: 3 / 1,      w: 1500, h: 500,  icon: <XIcon /> },
  { id: "li_post",   label: "LinkedIn Post",   dims: "1200 × 1200", ratio: 1,          w: 1200, h: 1200, icon: <LinkedInIcon /> },
  { id: "li_banner", label: "LinkedIn Banner", dims: "1584 × 396",  ratio: 1584 / 396, w: 1584, h: 396,  icon: <ImageIcon /> },
  { id: "ad_16_9",   label: "Ad · 16:9",       dims: "1200 × 675",  ratio: 16 / 9,     w: 1200, h: 675,  icon: <ImageIcon /> },
];

// gpt-image-1 renders square for posts and 3:2 for everything else.
const genRatioFor = (f: FormatId) => (f === "li_post" ? 1 : 1536 / 1024);
const formatMeta = (f: FormatId) => FORMATS.find((x) => x.id === f)!;

const STYLES: { id: StyleId; label: string }[] = [
  { id: "clean", label: "Clean" },
  { id: "bold", label: "Bold" },
  { id: "minimal", label: "Minimal" },
  { id: "playful", label: "Playful" },
  { id: "elegant", label: "Elegant" },
];

const DEMO_BRAND: BrandAssets = {
  domain: "acme.com",
  name: "ACME",
  description: "Real-time web data for modern teams.",
  slogan: null,
  logoUrl: null,
  primaryColor: "#2663ec",
  darkColor: "#0a2540",
  colors: [{ hex: "#2663ec", name: "Blue" }],
  logos: [],
  backdrops: [],
  socials: 0,
  creditsConsumed: null,
  creditsRemaining: null,
};

const DEMO_AD: Ad = { headline: "Ship features faster with real-time web data.", highlight: "real-time", body: "", cta: "acme.com" };

// Brands shown in the "works with any site" marquee (favicons via Google's CDN).
const MARQUEE_BRANDS: { name: string; domain: string }[] = [
  { name: "Stripe", domain: "stripe.com" },
  { name: "Linear", domain: "linear.app" },
  { name: "Notion", domain: "notion.so" },
  { name: "Vercel", domain: "vercel.com" },
  { name: "OpenAI", domain: "openai.com" },
  { name: "Figma", domain: "figma.com" },
  { name: "Framer", domain: "framer.com" },
  { name: "Anthropic", domain: "anthropic.com" },
  { name: "GitHub", domain: "github.com" },
  { name: "Shopify", domain: "shopify.com" },
  { name: "Ramp", domain: "ramp.com" },
  { name: "Loom", domain: "loom.com" },
];

const EXAMPLE_DOMAINS = ["stripe.com", "linear.app", "notion.so", "vercel.com"];

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
  } catch { return a; }
}
const lighten = (hex: string) => mix(hex, "#ffffff", 0.55);

// ── Ad Visual ─────────────────────────────────────────────────────────────────

function AdVisual({
  brand, ad, ratio, variant, className,
}: { brand: BrandAssets; ad: Ad; ratio: number; variant: Variant; className?: string }) {
  const primary = brand.primaryColor ?? "#2663ec";
  const dark = brand.darkColor ?? "#0a2540";

  let background: string, textColor: string, hlColor: string, ctaBg: string, ctaText: string, logoFilter: string, globeStroke: string, globeOpacity: number;
  if (variant === "light") {
    // Clean white — dark text, brand-colored accents & CTA.
    background = "#ffffff"; textColor = "#0b0b12"; hlColor = primary;
    ctaBg = primary; ctaText = "#ffffff"; logoFilter = "none"; globeStroke = primary; globeOpacity = 0.1;
  } else if (variant === "dark") {
    // Neutral charcoal — NOT the brand hue — with brand color as the accent so it
    // reads distinctly from the primary variant even for single-color brands.
    background = "radial-gradient(120% 120% at 100% 0%, #1b1d24 0%, #0a0b0f 60%)";
    textColor = "#ffffff"; hlColor = lighten(primary); ctaBg = primary; ctaText = "#ffffff"; logoFilter = "brightness(0) invert(1)"; globeStroke = primary; globeOpacity = 0.4;
  } else {
    // Full brand color gradient.
    background = `linear-gradient(135deg, ${primary} 0%, ${mix(primary, "#141235", 0.6)} 100%)`;
    textColor = "#ffffff"; hlColor = "#ffffff"; ctaBg = "rgba(255,255,255,0.16)"; ctaText = "#ffffff"; logoFilter = "brightness(0) invert(1)"; globeStroke = "#ffffff"; globeOpacity = 0.18;
  }

  const headlineNode = ad.highlight && ad.headline.includes(ad.highlight)
    ? (() => {
        const [before, after] = ad.headline.split(ad.highlight);
        return (<>{before}<span style={{ color: hlColor }}>{ad.highlight}</span>{after}</>);
      })()
    : ad.headline;

  return (
    <div
      className={`relative overflow-hidden ${variant === "light" ? "ring-1 ring-border" : ""} ${className ?? ""}`}
      style={{ aspectRatio: String(ratio), background, color: textColor }}
    >
      <GlobeGraphic stroke={globeStroke} opacity={globeOpacity} />
      <div className="relative flex h-full flex-col justify-between p-[5%]">
        <div className="flex items-center gap-2">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="h-[1.5em] w-auto max-w-[40%] object-contain object-left" style={{ filter: logoFilter }} />
          ) : (
            <span className="grid size-[1.6em] place-items-center rounded-md text-[0.7em] font-bold" style={{ background: variant === "light" ? primary : "rgba(255,255,255,0.15)", color: "#fff" }}>
              {(brand.name ?? "A")[0]}
            </span>
          )}
        </div>

        <p className="max-w-[88%] font-semibold leading-[1.12] tracking-tight" style={{ fontSize: "clamp(0.85rem, 2.6vw, 1.7rem)" }}>
          {ad.headline ? headlineNode : <span className="inline-block h-3 w-3/4 animate-pulse rounded" style={{ background: "currentColor", opacity: 0.2 }} />}
        </p>

        <div className="flex items-end justify-between gap-2">
          {ad.body
            ? <span className="max-w-[60%] text-[0.62em] leading-snug opacity-70">{ad.body}</span>
            : <span />}
          <span className="rounded-md px-[0.8em] py-[0.45em] text-[0.6em] font-semibold" style={{ background: ctaBg, color: ctaText }}>
            {ad.cta || brand.domain}
          </span>
        </div>
      </div>
    </div>
  );
}

function GlobeGraphic({ stroke, opacity }: { stroke: string; opacity: number }) {
  return (
    <svg viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 top-1/2 h-[150%] w-auto -translate-y-1/2" fill="none" stroke={stroke} strokeWidth="0.6" style={{ opacity }}>
      <circle cx="100" cy="100" r="80" />
      <ellipse cx="100" cy="100" rx="80" ry="30" />
      <ellipse cx="100" cy="100" rx="80" ry="55" />
      <ellipse cx="100" cy="100" rx="30" ry="80" />
      <ellipse cx="100" cy="100" rx="55" ry="80" />
      <line x1="20" y1="100" x2="180" y2="100" />
      <line x1="100" y1="20" x2="100" y2="180" />
    </svg>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary text-[13px] font-bold text-foreground shadow-[0_4px_12px_-4px_rgba(38,99,236,0.7)]">C</span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">Context<span className="text-primary">.dev</span></span>
    </a>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <a href="https://context.dev" className="text-muted-foreground transition hover:text-foreground">API</a>
          <a href="https://context.dev/docs" className="text-muted-foreground transition hover:text-foreground">Docs</a>
          <a href="https://context.dev/pricing" className="text-muted-foreground transition hover:text-foreground">Pricing</a>
          <a href="https://context.dev/blog" className="text-muted-foreground transition hover:text-foreground">Blog</a>
        </nav>
        <a href="https://context.dev" className="btn-gradient text-[13px]">Go to Dashboard</a>
      </div>
    </header>
  );
}

function FortuneCookie() {
  return (
    <a
      href="https://context.dev"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Built using Context.dev"
      className="fixed bottom-3 right-3 z-30 opacity-90 transition-opacity hover:opacity-100 sm:bottom-4 sm:right-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fortunecookie.png" alt="Built using Context.dev" className="w-36 drop-shadow-md sm:w-44" />
    </a>
  );
}

function PoweredBand() {
  return (
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-500/10 via-white/[0.02] to-fuchsia-500/10 px-6 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">Powered by the Context.dev Brand API</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">The same brand data trusted by thousands of AI agents and products.</p>
      </div>
      <div className="flex flex-wrap gap-5">
        {[{ i: <GlobeIcon />, l: "Logos" }, { i: <ColorIcon />, l: "Colors" }, { i: <FontIcon />, l: "Fonts" }, { i: <BookIcon />, l: "Styleguide" }].map((x) => (
          <div key={x.l} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="text-indigo-400">{x.i}</span>{x.l}</div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  const [view, setView] = useState<"landing" | "app">("landing");

  const [url, setUrl] = useState("");
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandAssets | null>(null);
  const [pageMarkdown, setPageMarkdown] = useState("");

  const [selectedFormats, setSelectedFormats] = useState<FormatId[]>(["x_banner", "li_post", "ad_16_9"]);
  const [mainMessage, setMainMessage] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [style, setStyle] = useState<StyleId>("clean");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ctaOverride, setCtaOverride] = useState("");

  const [results, setResults] = useState<Result[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());

  const activeBrand = brand ?? DEMO_BRAND;
  // Canonical order for generation + loading skeletons.
  const orderedFormats = FORMATS.filter((f) => selectedFormats.includes(f.id));

  function toggleFormat(id: FormatId) {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }

  // ── fetch brand ──
  const loadBrand = useCallback(async (rawUrl: string) => {
    setBrandError(null);
    setLoadingBrand(true);
    let clean = rawUrl.trim();
    if (!clean.startsWith("http")) clean = `https://${clean}`;
    try {
      const res = await fetch("/api/brand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: clean }) });
      const data = (await res.json()) as { brand: BrandAssets | null; pageMarkdown: string; error: string | null };
      if (!res.ok || !data.brand) { setBrandError(data.error ?? "Couldn't read that site. Try another URL."); return false; }
      setBrand(data.brand);
      setPageMarkdown(data.pageMarkdown ?? "");
      setView("app");
      return true;
    } catch { setBrandError("Network error. Check the URL and try again."); return false; }
    finally { setLoadingBrand(false); }
  }, []);

  // ── generate real ad images (one per selected format) ──
  const generate = useCallback(async () => {
    const b = brand ?? DEMO_BRAND;
    const formats = FORMATS.filter((f) => selectedFormats.includes(f.id)).map((f) => f.id);
    if (formats.length === 0) return;
    setGenError(null);
    setIsGenerating(true);
    setResults([]);
    setChosen(new Set());
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: b.domain,
          brandName: b.name ?? b.domain,
          description: b.description ?? b.slogan ?? "",
          pageContext: pageMarkdown.slice(0, 1800),
          colors: b.colors.map((c) => c.hex).slice(0, 5),
          colorNames: b.colors.map((c) => c.name ?? "").slice(0, 5),
          mainMessage, subMessage, ctaOverride, style, formats,
        }),
      });
      const data = (await res.json()) as { images?: Result[]; error?: string };
      if (!res.ok || !data.images) { setGenError(data.error ?? "Generation failed. Try again."); return; }
      setResults(data.images);
    } catch { setGenError("Generation failed. Try again."); }
    finally { setIsGenerating(false); }
  }, [brand, mainMessage, subMessage, ctaOverride, style, selectedFormats, pageMarkdown]);

  function toggleChosen(i: number) {
    setChosen((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  const allChosen = results.length > 0 && chosen.size === results.length;
  function toggleSelectAll() {
    setChosen(allChosen ? new Set() : new Set(results.map((_, i) => i)));
  }
  // Export at the format's exact pixel dimensions (cover-crop the generated image).
  function downloadImage(r: Result, i: number) {
    const fmt = formatMeta(r.format);
    const name = `${(activeBrand.name ?? activeBrand.domain).replace(/\W+/g, "-").toLowerCase()}-${fmt.id}-${i + 1}.png`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { w, h } = fmt;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = name;
      a.click();
    };
    img.onerror = () => { const a = document.createElement("a"); a.href = r.url; a.download = name; a.click(); };
    img.src = r.url;
  }
  function downloadAll() {
    const idxs = chosen.size > 0 ? [...chosen] : results.map((_, i) => i);
    idxs.forEach((idx, k) => setTimeout(() => downloadImage(results[idx], idx), k * 300));
  }

  // ══════════════════════════════ LANDING ══════════════════════════════
  if (view === "landing") {
    return (
      <div className="min-h-dvh overflow-x-hidden font-sans antialiased">
        <Header />

        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-5 pt-20 pb-16 sm:pt-28">
          {/* glow blobs */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-[-6rem] h-72 w-72 -translate-x-1/2 rounded-full bg-brand-purple/30 blur-[120px] animate-blob" />
            <div className="absolute right-[8%] top-24 h-64 w-64 rounded-full bg-brand-purple/20 blur-[120px] animate-blob [animation-delay:-6s]" />
            <div className="absolute left-[6%] top-40 h-56 w-56 rounded-full bg-brand-blue/20 blur-[120px] animate-blob [animation-delay:-3s]" />
          </div>

          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="pill-gradient animate-fade-up">
              <span>✨ AI ad generator</span>
            </div>

            <h1 className="mt-6 text-gradient text-5xl font-semibold leading-[1.05] tracking-tight animate-fade-up [animation-delay:60ms] sm:text-[4.25rem]">
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

          {/* Product preview banner */}
          <div className="relative mx-auto mt-16 max-w-4xl animate-fade-up [animation-delay:240ms]">
            <div className="absolute inset-x-8 -top-4 -z-10 h-40 rounded-full bg-brand-purple/30 blur-[80px]" />
            <div className="rounded-3xl border border-border bg-card p-3 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              <div className="grid gap-3 sm:grid-cols-3">
                <AdVisual brand={DEMO_BRAND} ad={DEMO_AD} ratio={16 / 9} variant="primary" className="rounded-2xl shadow-ad" />
                <AdVisual brand={DEMO_BRAND} ad={{ ...DEMO_AD, headline: "Real-time data. Zero maintenance.", cta: "Start free" }} ratio={16 / 9} variant="dark" className="rounded-2xl shadow-ad" />
                <AdVisual brand={DEMO_BRAND} ad={{ ...DEMO_AD, headline: "One API for every web context.", cta: "Read docs" }} ratio={16 / 9} variant="light" className="rounded-2xl shadow-ad ring-1 ring-border" />
              </div>
            </div>
            {/* floating chips */}
            <div className="absolute -left-3 top-8 hidden animate-float rounded-xl bg-card px-3 py-2 text-xs font-medium text-foreground shadow-notif ring-1 ring-border sm:flex sm:items-center sm:gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-primary text-white"><CheckIcon className="size-3" /></span> One ad per format
            </div>
            <div className="absolute -right-3 bottom-8 hidden animate-float [animation-delay:-3s] rounded-xl bg-card px-3 py-2 text-xs font-medium text-foreground shadow-notif ring-1 ring-border sm:flex sm:items-center sm:gap-2">
              <span className="text-primary"><DownloadIcon /></span> Export-ready PNG
            </div>
          </div>
        </section>

        {/* ── Logo marquee ── */}
        <section className="py-10">
          <p className="mb-7 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Pulls brand data from any site on the web</p>
          <div className="marquee-mask relative overflow-hidden pause-on-hover">
            <div className="flex w-max animate-marquee gap-4">
              {[...MARQUEE_BRANDS, ...MARQUEE_BRANDS].map((brnd, i) => (
                <div key={i} className="flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2 backdrop-blur">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://www.google.com/s2/favicons?sz=64&domain=${brnd.domain}`} alt="" className="size-5 rounded" loading="lazy" />
                  <span className="text-sm font-medium text-muted-foreground">{brnd.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="relative mx-auto max-w-5xl px-5 py-16">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-10 -z-10 h-40 w-2/3 -translate-x-1/2 rounded-full bg-brand-purple/25 blur-[120px]" />
          <div className="text-center">
            <div className="pill-gradient"><span>How it works</span></div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">From URL to ad in three steps</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { n: 1, icon: <GlobeIcon />, title: "Add your brand URL", desc: "We pull your logo, colors, fonts, and style guide automatically." },
              { n: 2, icon: <SlidersIcon />, title: "Choose what you want", desc: "Pick a format and tell us what to promote — or let AI decide." },
              { n: 3, icon: <SparkleIcon />, title: "Generate & download", desc: "Get multiple on-brand, AI-generated variations in seconds." },
            ].map((s) => (
              <div key={s.n} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/50">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/0 blur-2xl transition group-hover:bg-primary/25" />
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple text-white shadow-glow">{s.icon}</span>
                  <span className="text-4xl font-bold text-foreground/[0.06] transition group-hover:text-foreground/15">0{s.n}</span>
                </div>
                <p className="text-[15px] font-semibold text-foreground">{s.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row">
            <Logo />
            <p>Built with the <a href="https://context.dev" className="font-medium text-muted-foreground hover:text-primary">Context.dev Brand API</a> · © {new Date().getFullYear()} Context.dev, Inc.</p>
          </div>
        </footer>
        <FortuneCookie />
      </div>
    );
  }

  // ══════════════════════════════ APP ══════════════════════════════
  const b = activeBrand;

  return (
    <div className="min-h-dvh font-sans antialiased">
      <Header />

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        {/* Brand kit — flexes the full Context API payload, auto-collapses */}
        <BrandFlex brand={b} url={url} setUrl={setUrl} onLoad={() => url.trim() && void loadBrand(url)} loading={loadingBrand} />
        {brandError && <p className="text-xs text-red-600">{brandError}</p>}

        {/* Studio: controls (left) + gallery (right) */}
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Controls column */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Formats — multi-select, up to 3 */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Formats</p>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-brand-washed ring-1 ring-primary/30">{selectedFormats.length}/3</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => {
                  const isSel = selectedFormats.includes(f.id);
                  const disabled = !isSel && selectedFormats.length >= 3;
                  return (
                    <button key={f.id} onClick={() => toggleFormat(f.id)} disabled={disabled}
                      className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 pr-6 text-left transition ${isSel ? "border-primary bg-primary/15" : "border-border bg-white/[0.02] hover:border-primary/50"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}>
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${isSel ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{f.icon}</span>
                      <div className="min-w-0 leading-tight"><p className="text-[12px] font-semibold text-foreground">{f.label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{f.dims}</p></div>
                      {isSel && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary text-white"><CheckIcon className="size-2.5" /></span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Pick up to 3 — we generate one distinct on-brand ad for each.</p>
            </div>

            {/* Customize */}
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
                      {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <button onClick={() => setAdvancedOpen((v) => !v)} className="flex w-full items-center justify-between text-[13px] font-semibold text-muted-foreground">
                    Advanced options<ChevronDown className={`size-4 text-muted-foreground transition ${advancedOpen ? "rotate-180" : ""}`} />
                  </button>
                  {advancedOpen && (
                    <div className="mt-4">
                      <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Custom call-to-action</label>
                      <input type="text" value={ctaOverride} onChange={(e) => setCtaOverride(e.target.value)} placeholder="e.g. Start free trial" className="input" />
                    </div>
                  )}
                </div>
                <button onClick={() => void generate()} disabled={isGenerating || selectedFormats.length === 0} className="btn-dark w-full">
                  {isGenerating ? <span className="flex items-center gap-2"><span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Generating…</span> : <>✨ Generate {selectedFormats.length} ad{selectedFormats.length === 1 ? "" : "s"}</>}
                </button>
              </div>
            </div>
          </div>

          {/* Gallery column */}
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
                  <button onClick={downloadAll} className="btn-dark px-3 py-1.5 text-[12px]"><DownloadIcon /> {chosen.size > 0 ? `Download ${chosen.size}` : "Download all"}</button>
                </div>
              )}
            </div>

            {/* Empty state */}
            {results.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/[0.015] px-6 py-20 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple text-white shadow-glow"><ImageIcon /></span>
                <p className="mt-4 text-[15px] font-semibold text-foreground">Your ad creatives will appear here</p>
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">Choose your formats on the left, add an optional message, and hit generate — we&apos;ll craft one distinct, on-brand ad for each format.</p>
                <button onClick={() => void generate()} disabled={selectedFormats.length === 0} className="btn-dark mt-6"><SparkleIcon /> Generate {selectedFormats.length} ad{selectedFormats.length === 1 ? "" : "s"}</button>
                {genError && <p className="mt-4 text-xs text-red-500">{genError}</p>}
              </div>
            )}

            {/* Loading — one skeleton per selected format, true shape */}
            {isGenerating && (
              <div className="space-y-5">
                <div className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Painting {orderedFormats.length} on-brand ad{orderedFormats.length === 1 ? "" : "s"} — usually ~20–40s
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

            {/* Results — vertical gallery, WYSIWYG crop matches download */}
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
                          <button onClick={() => downloadImage(r, i)} className="btn-secondary px-2.5 py-1.5 text-[12px]"><DownloadIcon /> Download</button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className={`group relative mx-auto w-full ${maxW} overflow-hidden rounded-lg ring-1 ring-border`} style={{ aspectRatio: String(f.ratio) }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.url} alt={`${f.label} ad`} className="size-full object-cover" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {genError && <p className="text-xs text-red-500">{genError}</p>}

                <div className="flex justify-center pt-1">
                  <button onClick={() => void generate()} disabled={isGenerating} className="btn-secondary text-[13px]"><RefreshIcon /> Regenerate</button>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
      <FortuneCookie />
    </div>
  );
}

// ── Brand kit (flexes the full Context Brand API, auto-collapses) ───────────────

function BrandFlex({ brand, url, setUrl, onLoad, loading }: {
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
      {/* Always-visible bar */}
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

        {/* collapsed mini-preview */}
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

      {/* Expandable full brand kit — smooth height animation */}
      <div className={`grid transition-all duration-500 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-border p-5">
            {/* API flex line */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 px-2.5 py-1 text-[11px] font-semibold text-brand-washed ring-1 ring-primary/30">
                <BoltIcon /> Extracted live by the Context.dev Brand API
              </span>
              <span className="text-[11px] text-muted-foreground">{assetCount} assets · in under a second</span>
            </div>

            {(brand.description || brand.slogan) && (
              <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground animate-fade-up">{brand.description ?? brand.slogan}</p>
            )}

            {/* Colors — full palette */}
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

            {/* Logos — every variant */}
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

            {/* Backdrops — the good imagery, big */}
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

            {/* Metrics */}
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>; }
function LinkedInIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>; }
function ImageIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>; }
function GlobeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>; }
function SlidersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="2" fill="currentColor" stroke="none"/></svg>; }
function SparkleIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path d="M12 2l1.6 4.9L18.5 8.5l-4.9 1.6L12 15l-1.6-4.9L5.5 8.5l4.9-1.6z"/></svg>; }
function ChevronDown({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? "size-4"}><path d="m6 9 6 6 6-6"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>; }
function RefreshIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>; }
function CheckIcon({ className }: { className?: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className ?? "size-4"}><path d="m5 13 4 4L19 7"/></svg>; }
function BoltIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" className="size-3"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"/></svg>; }
function ColorIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="13" r="1.3" fill="currentColor" stroke="none"/></svg>; }
function FontIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M5 20 12 4l7 16M7.5 14h9"/></svg>; }
function BookIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>; }
