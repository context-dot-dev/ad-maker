"use client";

import { useEffect, useState } from "react";
import { XIcon, CheckIcon } from "@/components/icons";
import type { BrandAssets } from "@/lib/types";

/**
 * Compact share sheet. Small and modular — a preview, the caption, and one
 * button that opens the X composer (with the ad copied to the clipboard).
 */
export function ShareSheet({
  brand,
  dataUrl,
  ratio,
  caption,
  onShare,
  onClose,
}: {
  brand: BrandAssets;
  dataUrl: string | null;
  ratio: number;
  caption: string;
  onShare: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = () => {
    onShare();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-fade-up relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-border bg-card shadow-ad">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">Share on X</p>
          <button onClick={onClose} className="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="space-y-3 p-4">
          {dataUrl && (
            <div className="mx-auto w-full overflow-hidden rounded-lg ring-1 ring-border" style={{ maxWidth: ratio < 1.2 ? 220 : "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Ad preview" className="w-full object-cover" style={{ aspectRatio: String(ratio), maxHeight: 200 }} />
            </div>
          )}

          <div className="rounded-lg border border-border bg-white/[0.02] p-3">
            <p className="whitespace-pre-line text-[12px] leading-relaxed text-muted-foreground">{caption}</p>
          </div>

          <button
            onClick={share}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-[13px] font-semibold text-white transition hover:bg-zinc-800"
          >
            <XIcon /> Share on X
          </button>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Tags <span className="font-medium text-brand-washed">@getcontextdev</span></span>
            <button onClick={copyCaption} className="inline-flex items-center gap-1 transition hover:text-foreground">
              {copied ? <><CheckIcon className="size-3" /> Copied</> : "Copy caption"}
            </button>
          </div>

          <p className="text-center text-[10.5px] leading-snug text-muted-foreground/70">
            Opens X with your caption ready — the ad is copied so you just paste it (⌘/Ctrl + V). Sharing unlocks downloads.
          </p>
        </div>
      </div>
    </div>
  );
}
