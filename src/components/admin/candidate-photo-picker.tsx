"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Pencil, X } from "lucide-react";
import { cn } from "cn";
import { validateCandidatePhoto, InvalidCandidatePhotoError, MAX_FILE_SIZE_BYTES } from "@/lib/storage/candidate-photo";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** A custom-styled picker for the *create* flow, where no candidateId
 * exists yet to upload a photo against — unlike CandidatePhotoUpload
 * (edit mode, uploads immediately), this just validates the file and
 * holds it in memory; the parent uploads it only once the candidate
 * itself has been created. Validates the actual file bytes (magic
 * numbers), not just the browser-reported MIME type or extension, using
 * the same check the server re-runs — a renamed .html-as-.jpg is
 * rejected here too, not just server-side. */
export function CandidatePhotoPicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived straight from `file` (which the parent fully controls, e.g.
  // resetting it to null when the sheet closes/reopens) rather than
  // mirrored into its own state via an effect - one blob URL always
  // matches the current `file` exactly, with no separate state to fall
  // out of sync. The cleanup revokes each URL exactly once, whether it's
  // being replaced by a new one or the component is unmounting.
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
      validateCandidatePhoto(buffer, buffer.byteLength);
    } catch (err) {
      setError(err instanceof InvalidCandidatePhotoError ? err.message : "Could not process the image.");
      return;
    }
    onChange(selected);
  }

  function handleRemove() {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-2">
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
      <div className="group relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-primary/50 hover:bg-muted/50",
            previewUrl && "border-solid border-transparent hover:border-transparent"
          )}
        >
          {previewUrl ? (
            <>
              {/* A blob: object URL, not a servable image - next/image's
                  optimizer can't fetch it, so a plain <img> is the right
                  tool here, same as Radix Avatar.Image elsewhere in this
                  app. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="size-full rounded-full object-cover" />
              <span className="absolute inset-0 hidden items-center justify-center rounded-full bg-black/50 group-hover:flex">
                <Pencil className="size-5 text-white" />
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-2 text-muted-foreground">
              <div className="flex size-9 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                <Camera className="size-4" />
              </div>
              <span className="text-xs font-medium">Upload photo</span>
            </div>
          )}
        </button>
        {previewUrl && (
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
