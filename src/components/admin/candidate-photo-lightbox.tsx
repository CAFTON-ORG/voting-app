"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** The candidate's photo, enlarged in a Dialog on click — a plain <img>
 * has no way to show more detail than the thumbnail, and this candidate's
 * face is often the one thing an admin needs to actually verify. */
export function CandidatePhotoLightbox({ photoUrl, fullName }: { photoUrl: string; fullName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative aspect-4/5 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-56"
      >
        <Image src={photoUrl} alt={fullName} fill className="object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <Expand className="size-6 text-white" />
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">{fullName}</DialogTitle>
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-lg">
            <Image src={photoUrl} alt={fullName} fill className="object-contain" sizes="(min-width: 640px) 42rem, 100vw" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
