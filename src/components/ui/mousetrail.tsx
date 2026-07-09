"use client";

import { cn } from "@/lib/utils";
import { createRef, useEffect, useRef } from "react";

interface ImageMouseTrailProps {
  items: string[];
  className?: string;
  imgClass?: string;
  distance?: number;
  maxNumberOfImages?: number;
  fadeAnimation?: boolean;
}

/**
 * Full-viewport image mouse trail. Listens on `window` and paints trailing
 * images at the cursor anywhere on the page (fixed layer, pointer-events-none).
 */
export default function ImageMouseTrail({
  items,
  className,
  imgClass = "w-40 h-48",
  distance = 20,
  maxNumberOfImages = 5,
  fadeAnimation = false,
}: ImageMouseTrailProps) {
  const refs = useRef(items.map(() => createRef<HTMLImageElement>()));
  const zIndex = useRef(1);
  const globalIndex = useRef(0);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const activate = (image: HTMLImageElement, x: number, y: number) => {
      image.style.left = `${x}px`;
      image.style.top = `${y}px`;
      if (zIndex.current > 40) zIndex.current = 1;
      image.style.zIndex = String(zIndex.current);
      zIndex.current++;
      image.dataset.status = "active";
      if (fadeAnimation) setTimeout(() => { image.dataset.status = "inactive"; }, 1500);
      last.current = { x, y };
    };

    const handle = (x: number, y: number) => {
      if (Math.hypot(x - last.current.x, y - last.current.y) <= window.innerWidth / distance) return;
      const len = refs.current.length;
      const lead = refs.current[globalIndex.current % len].current;
      const tail = refs.current[(((globalIndex.current - maxNumberOfImages) % len) + len) % len]?.current;
      if (lead) activate(lead, x, y);
      if (tail) tail.dataset.status = "inactive";
      globalIndex.current++;
    };

    const onMouse = (e: MouseEvent) => handle(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) handle(t.clientX, t.clientY); };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [distance, maxNumberOfImages, fadeAnimation]);

  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}>
      {items.map((item, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={index}
          src={item}
          alt=""
          ref={refs.current[index]}
          data-status="inactive"
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 scale-0 object-cover opacity-0 transition-all duration-300 data-[status=active]:scale-100 data-[status=active]:opacity-100 data-[status=active]:duration-500 data-[status=active]:ease-out-expo",
            imgClass,
          )}
        />
      ))}
    </div>
  );
}
