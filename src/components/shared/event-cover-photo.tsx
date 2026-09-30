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
  logoClassName = "text-white/50",
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
  logoClassName?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const { bg } = getAvatarColor(name);

  if (!coverImageUrl) {
    return (
      <div
        aria-hidden
        className="flex size-full items-center justify-center"
        style={{ background: `radial-gradient(circle at 30% 20%, ${bg}, transparent 65%)` }}
      >
        <Logo size={logoSize} className={logoClassName} />
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
