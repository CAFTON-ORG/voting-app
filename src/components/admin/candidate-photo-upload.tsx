"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadCandidatePhotoAction, removeCandidatePhotoAction } from "@/actions/candidates/photo";

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
        toast.success("Photo updated");
        router.refresh();
      } else {
        setError(result.message);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleRemove() {
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
    <div className="flex items-center gap-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
        {pending ? (
          <div className="flex size-full items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : currentPhotoUrl ? (
          <Image src={currentPhotoUrl} alt="" fill className="object-cover" />
        ) : null}
      </div>
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
        {currentPhotoUrl ? "Replace" : "Upload photo"}
      </Button>
      {currentPhotoUrl && (
        <Button type="button" variant="ghost" size="icon" className="size-8" disabled={pending} onClick={handleRemove}>
          <X className="size-4" />
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
