"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadCandidatePhotoAction } from "@/actions/candidates/photo";

export function CandidatePhotoUpload({
  candidateId,
  currentPhotoUrl,
}: {
  candidateId: string;
  currentPhotoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      const result = await uploadCandidatePhotoAction(candidateId, formData);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex items-center gap-3">
      {currentPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not worth next/image config for an admin-only thumbnail
        <img
          src={currentPhotoUrl}
          alt=""
          className="size-10 rounded-md border object-cover"
        />
      ) : (
        <div className="size-10 rounded-md border border-dashed" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={pending}
        className="hidden"
        id={`photo-${candidateId}`}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? "Uploading…" : currentPhotoUrl ? "Replace photo" : "Upload photo"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
