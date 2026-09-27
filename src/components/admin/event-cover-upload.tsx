"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { cn } from "cn";
import { uploadEventCoverAction, removeEventCoverAction } from "@/actions/events/cover";
import { MAX_FILE_SIZE_BYTES } from "@/lib/storage/event-cover";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** A wide 16:9 dropzone — the banner shape an event's hero and home-page
 * card actually use it as, unlike the circular chrome used for candidate/
 * account photos elsewhere in this app. Uploads immediately on drop/pick,
 * same pattern as CandidatePhotoUpload. */
export function EventCoverUpload({
  eventId,
  currentCoverUrl,
}: {
  eventId: string;
  currentCoverUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [trackedUrl, setTrackedUrl] = useState(currentCoverUrl);
  if (currentCoverUrl !== trackedUrl) {
    setTrackedUrl(currentCoverUrl);
    setLoaded(false);
  }

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
    formData.set("cover", file);
    startTransition(async () => {
      try {
        const result = await uploadEventCoverAction(eventId, formData);
        if (result.ok) {
          toast.success("Cover image updated");
          router.refresh();
        } else {
          setError(result.message);
        }
      } catch {
        setError("Could not upload the image. Please try a smaller file.");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await removeEventCoverAction(eventId);
      if (result.ok) {
        toast.success("Cover image removed");
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
        id={`event-cover-${eventId}`}
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
          "group relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          pending ? "pointer-events-none opacity-60" : "",
          dragActive ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
        )}
      >
        {currentCoverUrl ? (
          <>
            <Image
              src={currentCoverUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 32rem, 100vw"
              onLoad={() => setLoaded(true)}
              className={cn("object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
            />
            {!loaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
              <Pencil className="size-5 text-white" />
              <span className="text-xs font-medium text-white">Change cover</span>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={handleRemove}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 disabled:pointer-events-none"
            >
              <X className="size-3.5" />
              <span className="sr-only">Remove cover image</span>
            </button>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-muted-foreground">
            <ImagePlus className="size-6" />
            <span className="text-xs font-medium">Click or drag to upload a cover image</span>
            <span className="text-[10px]">JPEG, PNG, WebP · up to 10MB · 16:9 recommended</span>
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
