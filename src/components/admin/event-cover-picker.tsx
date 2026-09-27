"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Pencil, X } from "lucide-react";
import { cn } from "cn";
import { validateEventCover, InvalidEventCoverError, MAX_FILE_SIZE_BYTES } from "@/lib/storage/event-cover";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Create-flow counterpart to EventCoverUpload, mirroring the same
 * deferred-file pattern CandidatePhotoPicker uses for candidates: no
 * eventId exists yet to upload a cover against, so this just validates
 * and previews the file locally — the parent uploads it once the event
 * itself has been created. */
export function EventCoverPicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(selected: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be 10MB or smaller.");
      return;
    }
    const buffer = new Uint8Array(await selected.arrayBuffer());
    try {
      validateEventCover(buffer, buffer.byteLength);
    } catch (err) {
      setError(err instanceof InvalidEventCoverError ? err.message : "Could not process the image.");
      return;
    }
    onChange(selected);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFile(selected);
        }}
        className="hidden"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
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
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) handleFile(dropped);
        }}
        className={cn(
          "group relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          dragActive ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
        )}
      >
        {previewUrl ? (
          <>
            {/* A blob: object URL, not a servable image - next/image's
                optimizer can't fetch it, same reasoning as
                CandidatePhotoPicker. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
              <Pencil className="size-5 text-white" />
              <span className="text-xs font-medium text-white">Change cover</span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
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
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
