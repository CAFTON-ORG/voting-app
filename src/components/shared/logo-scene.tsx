"use client";

import { useRef } from "react";
import { Logo } from "@/components/shared/logo";

/** An interactive, pseudo-3D presentation of the CAFTON mark — pure CSS
 * (perspective + per-pointer-move rotateX/rotateY set as custom
 * properties), not a WebGL/three.js scene: this app doesn't otherwise
 * ship any 3D rendering, and pulling in a renderer for one hero logo
 * would be a lot of new dependency weight for what a transform-based
 * tilt already sells convincingly. Idle float is motion-safe-gated. */
export function LogoScene({ size = 220 }: { size?: number }) {
  const tiltRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${x * 22}deg`);
    el.style.setProperty("--rx", `${y * -22}deg`);
    el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  }

  function handlePointerLeave() {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }

  return (
    <div
      className="motion-safe:animate-[logo-float_6s_ease-in-out_infinite]"
      style={{ perspective: "1000px" }}
    >
      <div
        ref={tiltRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative flex items-center justify-center rounded-[2.25rem] shadow-2xl shadow-black/20 transition-transform duration-300 ease-out will-change-transform dark:shadow-black/60"
        style={{
          width: size,
          height: size,
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="absolute inset-0 rounded-[2.25rem] bg-linear-to-br from-foreground via-foreground to-foreground/70"
          style={{ transform: "translateZ(-1px)" }}
        />
        <Logo
          size={size * 0.42}
          aria-hidden="true"
          className="relative text-background drop-shadow-sm"
          style={{ transform: "translateZ(40px)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[2.25rem] opacity-70 mix-blend-overlay"
          style={{
            background: "radial-gradient(circle at var(--mx, 30%) var(--my, 30%), white, transparent 60%)",
          }}
        />
      </div>
    </div>
  );
}
