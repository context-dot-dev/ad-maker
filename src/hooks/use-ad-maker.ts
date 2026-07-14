"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  briefHref,
  decodeAdRunPlan,
  renderedAdHref,
  type AdBrief,
  type PlannedConcept,
  type Six,
} from "@/lib/ad-run";
import { normalizeDomain } from "@/lib/net";

type ImageExtension = "png" | "jpg" | "webp";

type SlotBase = {
  concept: PlannedConcept;
  attempt: number;
};

type LoadingAdSlot = SlotBase & {
  status: "loading";
};

type DoneAdSlot = SlotBase & {
  status: "done";
  /** Object URL owned by this workflow. */
  url: string;
  ext: ImageExtension;
};

type ErrorAdSlot = SlotBase & {
  status: "error";
  message: string;
};

export type AdSlot = LoadingAdSlot | DoneAdSlot | ErrorAdSlot;

type IdleController = {
  phase: "idle";
  domain: string;
  setDomain(value: string): void;
  error: string | null;
  start(rawDomain: string): Promise<void>;
};

type BriefController = {
  phase: "brief";
  submittedDomain: string;
  reset(): void;
};

type ActiveController = {
  submittedDomain: string;
  brief: AdBrief;
  elapsed: number;
  doneCount: number;
  retrySlot(index: number): void;
  reset(): void;
  downloadAd(index: number): void;
};

type GeneratingController = ActiveController & {
  phase: "generating";
  slots: Six<AdSlot>;
};

type DoneController = ActiveController & {
  phase: "done";
  slots: Six<AdSlot>;
  downloadAll(): void;
  shareToX(): Promise<void>;
};

export type AdMakerController =
  | IdleController
  | BriefController
  | GeneratingController
  | DoneController;

type InternalState =
  | { stage: "idle"; error: string | null }
  | { stage: "brief"; epoch: number; submittedDomain: string }
  | {
      stage: "gallery";
      epoch: number;
      submittedDomain: string;
      brief: AdBrief;
      slots: Six<AdSlot>;
      settled: boolean;
    };

const SHARE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://link.context.dev/branda";

const DEFAULT_ERROR = "We couldn't read that site. Try another domain.";

function buildShareCaption(domain: string): string {
  return `just turned ${domain} into scroll-stopping, on-brand ads in seconds with @getcontextdev 🎨\n\npaste any URL → instant on-brand ads. no designer needed.`;
}

function extensionFor(blob: Blob): ImageExtension {
  if (blob.type.includes("webp")) return "webp";
  if (blob.type.includes("jpeg") || blob.type.includes("jpg")) return "jpg";
  return "png";
}

function replaceSlot(
  slots: Six<AdSlot>,
  index: number,
  next: AdSlot,
): Six<AdSlot> {
  return slots.map((slot, slotIndex) =>
    slotIndex === index ? next : slot,
  ) as unknown as Six<AdSlot>;
}

function allSlotsFinished(slots: Six<AdSlot>): boolean {
  return slots.every((slot) => slot.status !== "loading");
}

function responseError(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return DEFAULT_ERROR;
}

export function useAdMaker(): AdMakerController {
  const [domain, setDomain] = useState("");
  const [state, setReactState] = useState<InternalState>({
    stage: "idle",
    error: null,
  });
  const stateRef = useRef(state);
  const [elapsed, setElapsed] = useState(0);
  const epochRef = useRef(0);
  const rootControllerRef = useRef<AbortController | null>(null);
  const attemptsRef = useRef<number[]>([]);
  const objectUrlsRef = useRef(new Set<string>());
  const downloadTimersRef = useRef(new Set<number>());

  const commit = useCallback((next: InternalState) => {
    stateRef.current = next;
    setReactState(next);
  }, []);

  const revokeUrl = useCallback((url: string) => {
    if (!objectUrlsRef.current.delete(url)) return;
    URL.revokeObjectURL(url);
  }, []);

  const invalidateCurrentRun = useCallback(() => {
    epochRef.current += 1;
    rootControllerRef.current?.abort();
    rootControllerRef.current = null;
    attemptsRef.current = [];

    for (const timer of downloadTimersRef.current) window.clearTimeout(timer);
    downloadTimersRef.current.clear();

    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current.clear();
    return epochRef.current;
  }, []);

  const isCurrentAttempt = useCallback(
    (epoch: number, index: number, attempt: number, signal: AbortSignal) =>
      !signal.aborted &&
      epochRef.current === epoch &&
      rootControllerRef.current?.signal === signal &&
      attemptsRef.current[index] === attempt,
    [],
  );

  const fetchSlot = useCallback(
    async (
      epoch: number,
      brief: AdBrief,
      concept: PlannedConcept,
      index: number,
      attempt: number,
      signal: AbortSignal,
    ) => {
      try {
        const response = await fetch(renderedAdHref(brief, concept), {
          signal,
        });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const blob = await response.blob();
        if (!isCurrentAttempt(epoch, index, attempt, signal)) return;

        // No await occurs between the staleness check and ownership registration.
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.add(url);

        const current = stateRef.current;
        if (
          current.stage !== "gallery" ||
          current.epoch !== epoch ||
          current.slots[index]?.attempt !== attempt
        ) {
          revokeUrl(url);
          return;
        }

        const slots = replaceSlot(current.slots, index, {
          status: "done",
          concept,
          attempt,
          url,
          ext: extensionFor(blob),
        });
        commit({
          ...current,
          slots,
          settled: current.settled || allSlotsFinished(slots),
        });
      } catch (error) {
        if (!isCurrentAttempt(epoch, index, attempt, signal)) return;
        const current = stateRef.current;
        if (
          current.stage !== "gallery" ||
          current.epoch !== epoch ||
          current.slots[index]?.attempt !== attempt
        ) {
          return;
        }
        const slots = replaceSlot(current.slots, index, {
          status: "error",
          concept,
          attempt,
          message: (error as Error)?.message || "Render failed",
        });
        commit({
          ...current,
          slots,
          settled: current.settled || allSlotsFinished(slots),
        });
      }
    },
    [commit, isCurrentAttempt, revokeUrl],
  );

  const start = useCallback(
    async (rawDomain: string) => {
      setDomain(rawDomain);
      const submittedDomain = normalizeDomain(rawDomain);
      if (!submittedDomain) {
        invalidateCurrentRun();
        commit({
          stage: "idle",
          error: "Please enter a valid domain, e.g. stripe.com",
        });
        return;
      }

      const epoch = invalidateCurrentRun();
      const rootController = new AbortController();
      rootControllerRef.current = rootController;
      setElapsed(0);
      commit({ stage: "brief", epoch, submittedDomain });

      try {
        const response = await fetch(briefHref(submittedDomain), {
          signal: rootController.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(responseError(payload));

        const plan = decodeAdRunPlan(payload);
        if (plan.brief.domain !== submittedDomain) {
          throw new Error("The Brief did not match the submitted domain.");
        }
        if (
          rootController.signal.aborted ||
          epochRef.current !== epoch ||
          rootControllerRef.current !== rootController
        ) {
          return;
        }

        const slots = plan.concepts.map((concept) => ({
          status: "loading" as const,
          concept,
          attempt: 1,
        })) as unknown as Six<AdSlot>;
        attemptsRef.current = plan.concepts.map(() => 1);
        commit({
          stage: "gallery",
          epoch,
          submittedDomain,
          brief: plan.brief,
          slots,
          settled: false,
        });

        plan.concepts.forEach((concept, index) => {
          void fetchSlot(
            epoch,
            plan.brief,
            concept,
            index,
            1,
            rootController.signal,
          );
        });
      } catch (error) {
        if (
          rootController.signal.aborted ||
          epochRef.current !== epoch ||
          rootControllerRef.current !== rootController
        ) {
          return;
        }
        rootControllerRef.current = null;
        commit({
          stage: "idle",
          error: (error as Error)?.message || DEFAULT_ERROR,
        });
      }
    },
    [commit, fetchSlot, invalidateCurrentRun],
  );

  const reset = useCallback(() => {
    invalidateCurrentRun();
    setElapsed(0);
    setDomain("");
    commit({ stage: "idle", error: null });
  }, [commit, invalidateCurrentRun]);

  const retrySlot = useCallback(
    (index: number) => {
      const current = stateRef.current;
      const rootController = rootControllerRef.current;
      if (
        current.stage !== "gallery" ||
        !rootController ||
        rootController.signal.aborted ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= current.slots.length
      ) {
        return;
      }

      const slot = current.slots[index];
      if (slot.status !== "error") return;

      const attempt = slot.attempt + 1;
      attemptsRef.current[index] = attempt;
      commit({
        ...current,
        slots: replaceSlot(current.slots, index, {
          status: "loading",
          concept: slot.concept,
          attempt,
        }),
      });
      void fetchSlot(
        current.epoch,
        current.brief,
        slot.concept,
        index,
        attempt,
        rootController.signal,
      );
    },
    [commit, fetchSlot],
  );

  const triggerDownload = useCallback((url: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  }, []);

  const downloadAd = useCallback(
    (index: number) => {
      const current = stateRef.current;
      if (current.stage !== "gallery") return;
      const slot = current.slots[index];
      if (slot?.status !== "done") return;
      triggerDownload(
        slot.url,
        `${current.submittedDomain}-${slot.concept.key}.${slot.ext}`,
      );
    },
    [triggerDownload],
  );

  const downloadAll = useCallback(() => {
    const current = stateRef.current;
    if (current.stage !== "gallery") return;
    const downloads = current.slots.flatMap((slot) =>
      slot.status === "done"
        ? [
            {
              url: slot.url,
              filename: `${current.submittedDomain}-${slot.concept.key}.${slot.ext}`,
            },
          ]
        : [],
    );
    downloads.forEach((download, index) => {
      const timer = window.setTimeout(() => {
        downloadTimersRef.current.delete(timer);
        triggerDownload(download.url, download.filename);
      }, index * 300);
      downloadTimersRef.current.add(timer);
    });
  }, [triggerDownload]);

  const shareToX = useCallback(async () => {
    const current = stateRef.current;
    if (current.stage !== "gallery") return;
    const first = current.slots.find(
      (slot): slot is DoneAdSlot => slot.status === "done",
    );
    const caption = buildShareCaption(current.submittedDomain);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(SHARE_URL)}`,
      "_blank",
      "noopener,noreferrer",
    );
    try {
      if (
        first &&
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write
      ) {
        const blob = await (await fetch(first.url)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || "image/png"]: blob }),
        ]);
      }
    } catch {
      // Clipboard image support is optional; the composer still opens.
    }
  }, []);

  const isGenerating =
    state.stage === "gallery" &&
    state.slots.some((slot) => slot.status === "loading");
  const activeEpoch = state.stage === "gallery" ? state.epoch : null;

  useEffect(() => {
    if (!isGenerating) return;
    setElapsed(0);
    const timer = window.setInterval(
      () => setElapsed((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [activeEpoch, isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isGenerating]);

  useEffect(
    () => () => {
      invalidateCurrentRun();
    },
    [invalidateCurrentRun],
  );

  if (state.stage === "idle") {
    return { phase: "idle", domain, setDomain, error: state.error, start };
  }
  if (state.stage === "brief") {
    return {
      phase: "brief",
      submittedDomain: state.submittedDomain,
      reset,
    };
  }

  const doneCount = state.slots.filter((slot) => slot.status === "done").length;
  const active = {
    submittedDomain: state.submittedDomain,
    brief: state.brief,
    slots: state.slots,
    elapsed,
    doneCount,
    retrySlot,
    reset,
    downloadAd,
  };

  if (!state.settled) {
    return { phase: "generating", ...active };
  }
  return {
    phase: "done",
    ...active,
    slots: state.slots,
    downloadAll,
    shareToX,
  };
}
