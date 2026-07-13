"use client";

import { useCallback, useRef, useState } from "react";
import { FORMATS, formatMeta } from "@/lib/formats";
import { DEMO_BRAND } from "@/lib/constants";
import type { BrandAssets, FormatId, Result, StyleId } from "@/lib/types";

const SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://link.context.dev/branda";

export function buildShareCaption(domain: string): string {
  return `just turned ${domain} into scroll-stopping, on-brand ads in seconds with @getcontextdev 🎨\n\npaste any URL → instant on-brand ads. no designer needed.`;
}

/** Native share only makes sense on touch devices, where X is a real target. */
function isMobile(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** data:URL → Blob, synchronously, so clipboard/share writes keep the user gesture. */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/png";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export function useStudio() {
  const [view, setView] = useState<"landing" | "app">("landing");

  const [url, setUrl] = useState("");
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandAssets | null>(null);
  const [pageMarkdown, setPageMarkdown] = useState("");

  const [selectedFormats, setSelectedFormats] = useState<FormatId[]>(["li_post", "x_banner", "li_banner"]);
  const [mainMessage, setMainMessage] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [style, setStyle] = useState<StyleId>("clean");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ctaOverride, setCtaOverride] = useState("");
  const [textFree, setTextFree] = useState(false);

  const [results, setResults] = useState<Result[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  // Downloads stay locked until the user shares this batch on X (viral gate).
  const [shared, setShared] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const activeBrand = brand ?? DEMO_BRAND;
  const orderedFormats = FORMATS.filter((f) => selectedFormats.includes(f.id));

  const toggleFormat = useCallback((id: FormatId) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }, []);

  const loadBrand = useCallback(async (rawUrl: string) => {
    setBrandError(null);
    setLoadingBrand(true);
    let clean = rawUrl.trim();
    if (!clean.startsWith("http")) clean = `https://${clean}`;
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clean }),
      });
      const data = (await res.json()) as { brand: BrandAssets | null; pageMarkdown: string; error: string | null };
      if (!res.ok || !data.brand) {
        setBrandError(data.error ?? "Couldn't read that site. Try another URL.");
        return false;
      }
      setBrand(data.brand);
      setPageMarkdown(data.pageMarkdown ?? "");
      setView("app");
      return true;
    } catch {
      setBrandError("Network error. Check the URL and try again.");
      return false;
    } finally {
      setLoadingBrand(false);
    }
  }, []);

  const generate = useCallback(async () => {
    const b = brand ?? DEMO_BRAND;
    const formats = FORMATS.filter((f) => selectedFormats.includes(f.id)).map((f) => f.id);
    if (formats.length === 0) return;
    setGenError(null);
    setIsGenerating(true);
    setResults([]);
    setChosen(new Set());
    setShared(false);
    setShareHint(null);
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
          logoUrl: b.logoUrl ?? "",
          backdrops: b.backdrops.map((x) => x.url).slice(0, 6),
          mainMessage,
          subMessage,
          ctaOverride,
          style,
          textFree,
          formats,
        }),
      });
      const data = (await res.json()) as { images?: Result[]; error?: string };
      if (!res.ok || !data.images) {
        setGenError(data.error ?? "Generation failed. Try again.");
        return;
      }
      setResults(data.images);
    } catch {
      setGenError("Generation failed. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [brand, mainMessage, subMessage, ctaOverride, style, textFree, selectedFormats, pageMarkdown]);

  const toggleChosen = useCallback((i: number) => {
    setChosen((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }, []);

  const allChosen = results.length > 0 && chosen.size === results.length;
  const toggleSelectAll = useCallback(() => {
    setChosen(allChosen ? new Set() : new Set(results.map((_, i) => i)));
  }, [allChosen, results]);

  // AdCanvas registers its full-res canvas so downloads are pixel-identical to screen.
  const canvasMap = useRef<Record<number, HTMLCanvasElement>>({});
  const registerCanvas = useCallback((i: number, c: HTMLCanvasElement | null) => {
    if (c) canvasMap.current[i] = c;
    else delete canvasMap.current[i];
  }, []);

  /** PNG data URL of the composited ad at index `i` (for share previews / native share). */
  const getAdDataUrl = useCallback((i: number): string | null => {
    const c = canvasMap.current[i];
    return c ? c.toDataURL("image/png") : null;
  }, []);

  const downloadImage = useCallback((r: Result, i: number) => {
    const fmt = formatMeta(r.format);
    const name = `${(activeBrand.name ?? activeBrand.domain).replace(/\W+/g, "-").toLowerCase()}-${fmt.id}-${i + 1}.png`;
    const canvas = canvasMap.current[i];
    if (canvas) {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = name;
      a.click();
      return;
    }
    const img = new Image();
    img.onload = () => {
      const { w, h } = fmt;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = name;
      a.click();
    };
    img.onerror = () => {
      const a = document.createElement("a");
      a.href = r.url;
      a.download = name;
      a.click();
    };
    img.src = r.url;
  }, [activeBrand]);

  const downloadAll = useCallback(() => {
    const idxs = chosen.size > 0 ? [...chosen] : results.map((_, i) => i);
    idxs.forEach((idx, k) => setTimeout(() => downloadImage(results[idx], idx), k * 300));
  }, [chosen, results, downloadImage]);

  /**
   * One-tap share to X. On mobile (and browsers that support it) the image +
   * caption go straight into the X app. On desktop web — where X can't accept an
   * image via URL — we open the composer with the caption prefilled and copy the
   * ad to the clipboard so the user just pastes it. Sharing unlocks downloads.
   */
  const shareToX = useCallback(() => {
    const i = chosen.size > 0 ? Math.min(...chosen) : 0;
    const r = results[i];
    if (!r) return;

    const caption = buildShareCaption(activeBrand.domain);
    const dataUrl = getAdDataUrl(i);
    const blob = dataUrl ? dataUrlToBlob(dataUrl) : null;
    const file = blob ? new File([blob], `branda-${activeBrand.domain}.png`, { type: blob.type }) : null;

    // Mobile only: the native sheet lists X as a target. On desktop it lists
    // AirDrop/Mail/etc. instead, so we go straight to the X composer there.
    if (isMobile() && file && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], text: caption }).then(() => setShared(true)).catch(() => {});
      return;
    }

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(SHARE_URL)}`,
      "_blank",
      "noopener,noreferrer",
    );

    let copied = false;
    try {
      if (blob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        void navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).catch(() => {});
        copied = true;
      }
    } catch {
      /* clipboard image unsupported (e.g. Firefox) — fall back to a download */
    }
    if (!copied) downloadImage(r, i);

    setShared(true);
    setShareHint(copied ? "Image copied. Paste it into your post (⌘/Ctrl + V)" : "Ad saved. Attach it to your post");
    window.setTimeout(() => setShareHint(null), 8000);
  }, [chosen, results, activeBrand, getAdDataUrl, downloadImage]);

  return {
    view,
    url, setUrl,
    loadingBrand, brandError,
    activeBrand, pageMarkdown,
    selectedFormats, toggleFormat, orderedFormats,
    mainMessage, setMainMessage,
    subMessage, setSubMessage,
    style, setStyle,
    advancedOpen, setAdvancedOpen,
    ctaOverride, setCtaOverride,
    textFree, setTextFree,
    results, isGenerating, genError,
    chosen, allChosen,
    shared, shareHint,
    loadBrand, generate,
    toggleChosen, toggleSelectAll,
    registerCanvas, downloadImage, downloadAll, getAdDataUrl, shareToX,
  };
}

export type StudioController = ReturnType<typeof useStudio>;
