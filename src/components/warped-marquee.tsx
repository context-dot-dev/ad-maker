import { MARQUEE_BRANDS } from "@/lib/constants";

function Pill({ b }: { b: { name: string; domain: string } }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-card/80 px-5 py-2.5 shadow-card backdrop-blur">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://www.google.com/s2/favicons?sz=64&domain=${b.domain}`} alt="" className="size-5 rounded" loading="lazy" />
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">{b.name}</span>
    </div>
  );
}

export function WarpedMarquee() {
  const row = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS];
  return (
    <div aria-hidden className="pointer-events-none relative w-full select-none [perspective:1100px]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3.5 px-5 [transform:rotateX(42deg)_rotateZ(-3deg)] [transform-style:preserve-3d]">
        <div className="marquee-mask overflow-hidden">
          <div className="flex w-max animate-marquee gap-4">{row.map((b, i) => <Pill key={`a-${i}`} b={b} />)}</div>
        </div>
        <div className="marquee-mask overflow-hidden">
          <div className="flex w-max animate-marquee gap-4 [animation-direction:reverse]">{row.map((b, i) => <Pill key={`b-${i}`} b={b} />)}</div>
        </div>
        <div className="marquee-mask overflow-hidden">
          <div className="flex w-max animate-marquee gap-4">{row.map((b, i) => <Pill key={`c-${i}`} b={b} />)}</div>
        </div>
      </div>
    </div>
  );
}
