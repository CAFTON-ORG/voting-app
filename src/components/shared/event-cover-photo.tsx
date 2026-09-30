"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "cn";
import { Logo } from "@/components/shared/logo";
import { getAvatarColor } from "@/lib/format/avatar-color";

/** Drop-in event-cover counterpart to CandidatePhoto - same skeleton-
 * while-loading and fade-in behavior, but falls back to the CAFTON mark
 * over a per-event color wash instead of initials, since a cover image
 * has no "name" to initial. Meant to sit inside the caller's own sized
 * `relative` container, same as CandidatePhoto. */
export function EventCoverPhoto({
  coverImageUrl,
  name,
  sizes,
  className,
  logoSize = 28,
  logoOpacity = 0.55,
  priority = false,
}: {
  coverImageUrl: string | null;
  name: string;
  sizes: string;
  className?: string;
  /** Pixel size of the fallback CAFTON mark - scale this to the
   * container (a 28px table-row chip needs a much smaller mark than a
   * full-width card banner). */
  logoSize?: number;
  logoOpacity?: number;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  // getAvatarColor's bg is a fixed light wash (oklch lightness 0.9)
  // regardless of the site's own light/dark theme, so a plain white logo
  // is low-contrast against it either way - fg is the same hash's
  // purpose-built dark, hue-matched companion color, guaranteed to read
  // against this exact bg rather than assuming a color that happens to
  // work only in one theme.
  const { bg, fg } = getAvatarColor(name);

  if (!coverImageUrl) {
    return (
      <div
        aria-hidden
        className="flex size-full items-center justify-center"
        style={{ background: `radial-gradient(circle at 30% 20%, ${bg}, transparent 65%)` }}
      >
        <Logo size={logoSize} style={{ color: fg, opacity: logoOpacity }} />
      </div>
    );
  }

  return (
    <>
      <Image
        src={coverImageUrl}
        alt=""
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
