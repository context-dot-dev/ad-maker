import type { ReactNode } from "react";
import { LinkedInIcon, XIcon, ImageIcon } from "@/components/icons";
import type { FormatId, StyleId, TextLayout } from "./types";

export type FormatDef = {
  id: FormatId;
  label: string;
  dims: string;
  ratio: number;
  w: number;
  h: number;
  note: string;
  icon: ReactNode;
};

export const FORMATS: FormatDef[] = [
  { id: "li_post", label: "LinkedIn Post", dims: "1200 × 1200", ratio: 1, w: 1200, h: 1200, note: "Full ad with headline", icon: <LinkedInIcon /> },
  { id: "x_banner", label: "X Banner", dims: "1500 × 500", ratio: 3, w: 1500, h: 500, note: "Backdrop only", icon: <XIcon /> },
  { id: "li_banner", label: "LinkedIn Banner", dims: "1584 × 396", ratio: 1584 / 396, w: 1584, h: 396, note: "Backdrop only", icon: <ImageIcon /> },
];

export const formatMeta = (id: FormatId) => FORMATS.find((f) => f.id === id)!;

export const STYLES: { id: StyleId; label: string }[] = [
  { id: "clean", label: "Clean" },
  { id: "bold", label: "Bold" },
  { id: "minimal", label: "Minimal" },
  { id: "playful", label: "Playful" },
  { id: "elegant", label: "Elegant" },
];

export const DEFAULT_LAYOUT: TextLayout = { x: 0.06, y: 0.14, w: 0.5, h: 0.72, align: "left", theme: "light", scrim: true };
