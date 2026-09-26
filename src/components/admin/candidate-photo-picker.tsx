"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-3">
        {previewUrl && (
          // A blob: object URL, not a servable image - next/image's
          // optimizer can't fetch it, so a plain <img> is the right tool
          // here, same as Radix Avatar.Image elsewhere in this app.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
        )}
        <div className="flex flex-col items-start gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-3.5" />
            {file ? "Change photo" : "Upload photo"}
          </Button>
          {file ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
              Remove
            </button>
          ) : (
            <span className="text-[10px] text-muted-foreground">JPEG, PNG, WebP · up to 10MB</span>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
