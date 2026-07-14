"use client";

import { useAdMaker } from "@/hooks/use-ad-maker";
import { AdMaker } from "@/components/ad-maker";

export default function Page() {
  const s = useAdMaker();
  return <AdMaker s={s} />;
}
