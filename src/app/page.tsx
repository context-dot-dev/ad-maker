"use client";

import { useStudio } from "@/hooks/use-studio";
import { Landing } from "@/components/landing";
import { Studio } from "@/components/studio";

export default function Page() {
  const studio = useStudio();
  return studio.view === "landing" ? <Landing s={studio} /> : <Studio s={studio} />;
}
