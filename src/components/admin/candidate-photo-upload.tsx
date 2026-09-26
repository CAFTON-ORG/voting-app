"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Camera, Loader2, Pencil, X } from "lucide-react";
import { cn } from "cn";
import { uploadCandidatePhotoAction, removeCandidatePhotoAction } from "@/actions/candidates/photo";
import { MAX_FILE_SIZE_BYTES } from "@/lib/storage/candidate-photo";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** A real dropzone — click or drag a file onto the preview itself — rather
 * than a tiny thumbnail next to an unrelated "Upload photo" button. Same
 * circular-dropzone visual language as CandidatePhotoPicker (the create-
 * mode equivalent), so the two modes of the same form don't look like two
 * different features; this one uploads immediately on drop/pick instead
 * of holding the file for the parent to send later, since a real
 * candidateId already exists to upload against. The actual stored photo
 * still renders as a 4:5 crop everywhere else in the app (ballot cards,
 * the candidate detail page, the public gallery) - only this upload
 * widget's own chrome is circular. Client-side type/size checks give
 * instant feedback; validateCandidatePhoto on the server remains the
 * authoritative check either way. */
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
    <div className="flex flex-col items-center gap-2">
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
      <div className="relative">
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
            "group relative flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            pending ? "pointer-events-none opacity-60" : "",
            currentPhotoUrl ? "border-solid border-transparent" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50",
            dragActive && "border-primary bg-primary/5"
          )}
        >
          {currentPhotoUrl ? (
            <>
              <Image src={currentPhotoUrl} alt="" fill sizes="7rem" className="rounded-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
                <Pencil className="size-5 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-2 text-center text-muted-foreground">
              <div className="flex size-9 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                <Camera className="size-4" />
              </div>
              <span className="text-xs font-medium">Upload photo</span>
            </div>
          )}
          {pending && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        {currentPhotoUrl && !pending && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-0 right-0 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:bg-destructive"
          >
            <X className="size-3.5" />
            <span className="sr-only">Remove photo</span>
          </button>
        )}
      </div>
      <p className="text-center text-[10px] text-muted-foreground">
        Allowed *.jpeg, *.jpg, *.png, *.webp
        <br />
        max size of 10MB
      </p>
      {error && <p className="max-w-40 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
