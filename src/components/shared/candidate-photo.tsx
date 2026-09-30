"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "cn";
import { Logo } from "@/components/shared/logo";

/** Drop-in replacement for the `{photoUrl ? <Image fill .../> : <fallback>}`
 * pattern repeated across every candidate photo in the app — meant to sit
 * directly inside the caller's own sized `relative` container. Shows a
 * pulsing skeleton over the image until it actually finishes loading
 * (fill-positioned images have no natural "loading" affordance otherwise —
 * they just pop in), and falls back to the CAFTON mark (not initials) when
 * there's no photo, so a candidate with no photo yet reads as "no photo
 * uploaded" rather than as a second, competing identity marker next to
 * their actual name right beside it. Small circular per-row/stacked
 * avatars (CandidateAvatar, CandidateAvatarStack) keep initials instead -
 * those need to stay visually distinct from each other in a list, which a
 * repeated logo can't do; this component is always a single, large,
 * one-subject-at-a-time photo slot, where that concern doesn't apply. */
export function CandidatePhoto({
  photoUrl,
  fullName,
  sizes,
  className,
  logoSize = 40,
  logoClassName = "text-muted-foreground/40",
  priority = false,
}: {
  photoUrl: string | null;
  fullName: string;
  sizes: string;
  className?: string;
  /** Pixel size of the fallback CAFTON mark - scale this down for a small
   * photo slot (e.g. the review step's 64px thumbnail) and up for a large
   * one (e.g. the profile sheet's full-width photo). */
  logoSize?: number;
  logoClassName?: string;
  /** Pass true for whichever photo actually renders above the fold (e.g.
   * the first candidate in the first category on the event page) - Next
   * otherwise lazy-loads it like every other image, which is exactly
   * backwards for the one image that's also the page's LCP element. */
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!photoUrl) {
    return (
      <div className="flex size-full items-center justify-center">
        <Logo size={logoSize} className={logoClassName} />
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
