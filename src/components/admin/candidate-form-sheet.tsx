"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  createCandidateAction,
  updateCandidateLimitedAction,
  updateCandidateStructuralAction,
} from "@/actions/candidates/mutations";
import { CandidatePhotoUpload } from "@/components/admin/candidate-photo-upload";

type CategoryOption = { id: string; name: string };

export type CandidateFormValues = {
  id: string;
  categoryId: string;
  candidateNumber: number;
  fullName: string;
  programYear: string;
  tagline: string;
  bio: string;
  photoUrl: string | null;
};

export function CandidateFormSheet({
  open,
  onOpenChange,
  eventId,
  categories,
  /** Omit for "create"; pass the candidate's current values for "edit". */
  initialValues,
  /** "Create" only — preselects a category, e.g. right after that category
   * was just added, so the natural next step (add its first candidate)
   * doesn't require re-picking it from the dropdown. */
  presetCategoryId,
  /** Structural fields (number/category) are only editable in this window
   * — see assertStructuralChangesAllowed in the server action. */
  canEditStructural,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  categories: CategoryOption[];
  initialValues?: CandidateFormValues;
  presetCategoryId?: string;
  canEditStructural: boolean;
}) {
  const isEdit = Boolean(initialValues);
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId ?? presetCategoryId ?? categories[0]?.id ?? ""
  );
  const [candidateNumber, setCandidateNumber] = useState(String(initialValues?.candidateNumber ?? ""));
  const [fullName, setFullName] = useState(initialValues?.fullName ?? "");
  const [programYear, setProgramYear] = useState(initialValues?.programYear ?? "");
  const [tagline, setTagline] = useState(initialValues?.tagline ?? "");
  const [bio, setBio] = useState(initialValues?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (isEdit && initialValues) {
        const results = await Promise.all([
          updateCandidateLimitedAction({
            candidateId: initialValues.id,
            fullName,
            programYear: programYear || undefined,
            tagline: tagline || undefined,
            bio: bio || undefined,
          }),
          canEditStructural &&
          (categoryId !== initialValues.categoryId || Number(candidateNumber) !== initialValues.candidateNumber)
            ? updateCandidateStructuralAction({
                candidateId: initialValues.id,
                categoryId,
                candidateNumber: Number(candidateNumber),
              })
            : Promise.resolve({ ok: true as const, data: undefined }),
        ]);
        const failed = results.find((r) => !r.ok);
        if (failed && !failed.ok) {
          setError(failed.message);
          return;
        }
        toast.success("Candidate updated");
      } else {
        const result = await createCandidateAction({
          eventId,
          categoryId,
          candidateNumber: Number(candidateNumber),
          fullName,
          programYear: programYear || undefined,
          tagline: tagline || undefined,
          bio: bio || undefined,
          displayOrder: 0,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        toast.success("Candidate added");
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit candidate" : "Add candidate"}</SheetTitle>
            <SheetDescription>
              {canEditStructural
                ? "Full details, including category and number."
                : "Number and category are locked once voting could have started."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 px-4">
            {isEdit && initialValues && (
              <div className="flex flex-col gap-1.5">
                <Label>Photo</Label>
                <CandidatePhotoUpload candidateId={initialValues.id} currentPhotoUrl={initialValues.photoUrl} />
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="cand-category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={!canEditStructural}>
                  <SelectTrigger id="cand-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor="cand-number">Number</Label>
                <Input
                  id="cand-number"
                  type="number"
                  min={1}
                  required
                  disabled={!canEditStructural}
                  value={candidateNumber}
                  onChange={(e) => setCandidateNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cand-name">Full name</Label>
              <Input id="cand-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cand-program">Program/Year (optional)</Label>
              <Input id="cand-program" value={programYear} onChange={(e) => setProgramYear(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cand-tagline">Tagline (optional)</Label>
              <Input
                id="cand-tagline"
                maxLength={280}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cand-bio">Biography (optional)</Label>
              <Textarea
                id="cand-bio"
                rows={5}
                maxLength={2000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <SheetFooter>
            <Button type="submit" disabled={pending || !categoryId || !candidateNumber || !fullName}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add Candidate"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
