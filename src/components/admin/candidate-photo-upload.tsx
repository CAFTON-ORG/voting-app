"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { cn } from "cn";
import { uploadCandidatePhotoAction, removeCandidatePhotoAction } from "@/actions/candidates/photo";
import { MAX_FILE_SIZE_BYTES } from "@/lib/storage/candidate-photo";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** A real dropzone — click or drag a file onto the preview itself — rather
 * than a tiny thumbnail next to an unrelated "Upload photo" button. The
 * 4:5 aspect matches how the photo actually renders everywhere else
 * (ballot cards, the candidate detail page, the public gallery), so what
 * an admin sees here previews the real crop, not a square approximation.
 * Client-side type/size checks give instant feedback; validateCandidatePhoto
 * on the server remains the authoritative check either way. */
export function CandidatePhotoUpload({
  candidateId,
  currentPhotoUrl,
}: {
  candidateId: string;
  currentPhotoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submitFile(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be 10MB or smaller.");
      return;
    }
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      try {
        const result = await uploadCandidatePhotoAction(candidateId, formData);
        if (result.ok) {
          toast.success("Photo updated");
          router.refresh();
        } else {
          setError(result.message);
        }
      } catch {
        // uploadCandidatePhotoAction always returns ok/fail itself and never
        // throws - a rejection here means the request never reached it at
        // all (e.g. exceeding next.config.ts's serverActions.bodySizeLimit),
        // which would otherwise surface as an uncaught error crashing to
        // Next's generic error page instead of this inline message.
        setError("Could not upload the photo. Please try a smaller image.");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await removeCandidatePhotoAction(candidateId);
      if (result.ok) {
        toast.success("Photo removed");
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) submitFile(file);
        }}
        disabled={pending}
        className="hidden"
        id={`photo-${candidateId}`}
      />
      <div
        role="button"
        tabIndex={pending ? -1 : 0}
        aria-disabled={pending}
        onClick={() => !pending && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (pending) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) submitFile(file);
        }}
        className={cn(
          "group relative aspect-4/5 w-40 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          pending ? "pointer-events-none opacity-60" : "",
          dragActive ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
        )}
      >
        {currentPhotoUrl ? (
          <>
            <Image src={currentPhotoUrl} alt="" fill sizes="10rem" className="object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
              <Pencil className="size-5 text-white" />
              <span className="text-xs font-medium text-white">Change photo</span>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={handleRemove}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 disabled:pointer-events-none"
            >
              <X className="size-3.5" />
              <span className="sr-only">Remove photo</span>
            </button>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-muted-foreground">
            <ImagePlus className="size-6" />
            <span className="text-xs font-medium">Click or drag to upload</span>
            <span className="text-[10px]">JPEG, PNG, WebP · up to 10MB</span>
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {error && <p className="max-w-40 text-xs text-destructive">{error}</p>}
    </div>
  );
}
