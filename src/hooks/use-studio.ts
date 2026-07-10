"use client";

import { useCallback, useRef, useState } from "react";
import { FORMATS, formatMeta } from "@/lib/formats";
import { DEMO_BRAND } from "@/lib/constants";
import type { BrandAssets, FormatId, Result, StyleId } from "@/lib/types";

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
    loadBrand, generate,
    toggleChosen, toggleSelectAll,
    registerCanvas, downloadImage, downloadAll,
  };
}

export type StudioController = ReturnType<typeof useStudio>;
