"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "cn";

function initialsOf(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Drop-in replacement for the `{photoUrl ? <Image fill .../> : <initials>}`
 * pattern repeated across every candidate photo in the app — meant to sit
 * directly inside the caller's own sized `relative` container. Shows a
 * pulsing skeleton over the image until it actually finishes loading
 * (fill-positioned images have no natural "loading" affordance otherwise —
 * they just pop in), and falls back to initials when there's no photo. */
export function CandidatePhoto({
  photoUrl,
  fullName,
  sizes,
  className,
  initialsClassName = "text-3xl",
  priority = false,
}: {
  photoUrl: string | null;
  fullName: string;
  sizes: string;
  className?: string;
  initialsClassName?: string;
  /** Pass true for whichever photo actually renders above the fold (e.g.
   * the first candidate in the first category on the event page) - Next
   * otherwise lazy-loads it like every other image, which is exactly
   * backwards for the one image that's also the page's LCP element. */
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!photoUrl) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center font-semibold text-muted-foreground",
          initialsClassName
        )}
      >
        {initialsOf(fullName)}
      </div>
    );
  }

  return (
    <>
      <Image
        src={photoUrl}
        alt={fullName}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={cn("object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
      />
      {!loaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
    </>
  );
}
