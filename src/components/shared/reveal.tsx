"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

/** Fades/slides a section in the first time it scrolls into view. Skips
 * itself entirely for prefers-reduced-motion via the motion-safe: variant
 * on the animation class — content is always in the DOM and visible
 * either way, this only ever adds a transition. */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        !shown && "opacity-0",
        shown && "motion-safe:animate-[fade-up_0.6s_ease-out_backwards]",
        className
      )}
      style={shown ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
