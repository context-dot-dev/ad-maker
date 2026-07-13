"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdBriefView, PlannedConceptView } from "@/lib/types";

export type Phase = "idle" | "brief" | "generating" | "done";

export type AdSlot = {
  concept: PlannedConceptView;
  status: "loading" | "done" | "error";
  /** Object URL of the finished image (display + download share one blob). */
  url: string | null;
  /** File extension derived from the blob type — models return PNG, JPEG, or WebP. */
  ext: "png" | "jpg" | "webp";
};

const SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://link.context.dev/branda";

export function buildShareCaption(domain: string): string {
  return `just turned ${domain} into scroll-stopping, on-brand ads in seconds with @getcontextdev 🎨\n\npaste any URL → instant on-brand ads. no designer needed.`;
}

/** The /api/ad URL for one concept. Same brief → same URL → Vercel CDN cache hit. */
function buildAdUrl(brief: AdBriefView, c: PlannedConceptView): string {
  const params = new URLSearchParams({
    domain: brief.domain,
    concept: c.key,
    model: c.model,
    headline: c.headline,
    sub: c.subheadline,
    name: brief.brandName,
    colorA: brief.colorA,
    colorB: brief.colorB,
    summary: brief.summary,
    industry: brief.industry,
    mood: brief.mood,
  });
  if (brief.logoUrl) params.set("logo", brief.logoUrl);
  return `/api/ad?${params.toString()}`;
}

export function useAdMaker() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<AdBriefView | null>(null);
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const runId = useRef(0);
  const urls = useRef<string[]>([]);

  // Elapsed-seconds ticker while ads render (generation takes 1–3 minutes).
  useEffect(() => {
    if (phase !== "generating") return;
    setElapsed(0);
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  // Don't let the tab close silently mid-generation.
  useEffect(() => {
    if (phase !== "generating") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const revokeAll = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  };

  const fetchAd = useCallback(async (run: number, b: AdBriefView, c: PlannedConceptView, index: number) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, status: "loading", url: null } : s)));
    try {
      const res = await fetch(buildAdUrl(b, c));
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      if (runId.current !== run) return;
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      const ext = blob.type.includes("webp")
        ? ("webp" as const)
        : blob.type.includes("jpeg") || blob.type.includes("jpg")
          ? ("jpg" as const)
          : ("png" as const);
      setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, status: "done", url, ext } : s)));
    } catch {
      if (runId.current !== run) return;
      setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, status: "error", url: null } : s)));
    }
  }, []);

  /** The whole flow: domain → brief → 6 ads racing in, each landing as it finishes. */
  const start = useCallback(
    async (rawDomain: string) => {
      const input = rawDomain.trim();
      if (!input) return;
      const run = ++runId.current;
      revokeAll();
      setError(null);
      setBrief(null);
      setSlots([]);
      setPhase("brief");

      let data: { brief: AdBriefView; concepts: PlannedConceptView[]; error?: string };
      try {
        const res = await fetch(`/api/brief?domain=${encodeURIComponent(input)}`);
        data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "brief failed");
      } catch (e) {
        if (runId.current !== run) return;
        setError((e as Error)?.message || "We couldn't read that site. Try another domain.");
        setPhase("idle");
        return;
      }
      if (runId.current !== run) return;

      setBrief(data.brief);
      setSlots(data.concepts.map((concept) => ({ concept, status: "loading" as const, url: null, ext: "png" as const })));
      setPhase("generating");

      await Promise.allSettled(data.concepts.map((c, i) => fetchAd(run, data.brief, c, i)));
      if (runId.current === run) setPhase("done");
    },
    [fetchAd],
  );

  /** Failed slots retry against the same URL — errors are never CDN-cached, so it's free. */
  const retrySlot = useCallback(
    (index: number) => {
      if (!brief) return;
      const slot = slots[index];
      if (!slot || slot.status === "loading") return;
      void fetchAd(runId.current, brief, slot.concept, index);
    },
    [brief, slots, fetchAd],
  );

  const reset = useCallback(() => {
    runId.current++;
    revokeAll();
    setPhase("idle");
    setBrief(null);
    setSlots([]);
    setError(null);
    setDomain("");
  }, []);

  const downloadAd = useCallback(
    (index: number) => {
      const slot = slots[index];
      if (!slot?.url || !brief) return;
      const a = document.createElement("a");
      a.href = slot.url;
      a.download = `${brief.domain}-${slot.concept.key}.${slot.ext}`;
      a.click();
    },
    [slots, brief],
  );

  const downloadAll = useCallback(() => {
    slots.forEach((s, i) => {
      if (s.status === "done") window.setTimeout(() => downloadAd(i), i * 300);
    });
  }, [slots, downloadAd]);

  /**
   * One-tap share to X: opens the composer with the caption prefilled and
   * copies the first finished ad to the clipboard so the user just pastes it.
   */
  const shareToX = useCallback(async () => {
    if (!brief) return;
    const first = slots.find((s) => s.status === "done" && s.url);
    const caption = buildShareCaption(brief.domain);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(SHARE_URL)}`,
      "_blank",
      "noopener,noreferrer",
    );
    try {
      if (first?.url && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = await (await fetch(first.url)).blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      }
    } catch {
      /* clipboard image unsupported — composer still opens */
    }
  }, [brief, slots]);

  const doneCount = slots.filter((s) => s.status === "done").length;

  return {
    phase,
    domain,
    setDomain,
    error,
    brief,
    slots,
    elapsed,
    doneCount,
    start,
    retrySlot,
    reset,
    downloadAd,
    downloadAll,
    shareToX,
  };
}

export type AdMakerController = ReturnType<typeof useAdMaker>;
