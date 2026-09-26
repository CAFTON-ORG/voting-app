"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

/** The candidate's photo, enlarged in a Dialog on click — a plain <img>
 * has no way to show more detail than the thumbnail, and this candidate's
 * face is often the one thing an admin needs to actually verify. Same
 * pulsing-skeleton-until-loaded treatment as CandidatePhoto elsewhere in
 * the app — a fill-positioned Image has no natural "loading" affordance
 * on its own, it just pops in. The thumbnail and the dialog's larger
 * image track their own loaded state separately since they're two
 * distinct Image instances (though the browser cache usually makes the
 * dialog's feel instant after the thumbnail's already loaded). */
export function CandidatePhotoLightbox({ photoUrl, fullName }: { photoUrl: string; fullName: string }) {
  const [open, setOpen] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative aspect-4/5 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-80"
      >
        <Image
          src={photoUrl}
          alt={fullName}
          fill
          sizes="(min-width: 640px) 20rem, 100vw"
          onLoad={() => setThumbLoaded(true)}
          className={cn("object-cover transition-opacity duration-300", thumbLoaded ? "opacity-100" : "opacity-0")}
        />
        {!thumbLoaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <Expand className="size-6 text-white" />
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">{fullName}</DialogTitle>
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-lg bg-muted">
            <Image
              src={photoUrl}
              alt={fullName}
              fill
              className={cn("object-contain transition-opacity duration-300", fullLoaded ? "opacity-100" : "opacity-0")}
              sizes="(min-width: 640px) 42rem, 100vw"
              onLoad={() => setFullLoaded(true)}
            />
            {!fullLoaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
