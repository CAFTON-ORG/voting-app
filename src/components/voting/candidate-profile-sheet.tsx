"use client";

import { Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CandidatePhoto } from "@/components/shared/candidate-photo";

export type PublicCandidateProfile = {
  id: string;
  candidateNumber: number;
  fullName: string;
  photoUrl: string | null;
  programYear: string | null;
  tagline: string | null;
  bio: string | null;
  categoryName: string;
};

/** The public-safe candidate profile — deliberately a separate component
 * from the admin candidate detail page, and deliberately a Sheet rather
 * than a full route: opening it from inside the ballot never unmounts the
 * category list, so the voter's in-progress selections can't be lost by
 * "going back" from a profile (see the ballot flow's state-preservation
 * requirement). `onSelect` is omitted entirely when this is opened from
 * pre-authentication browsing, where there's no ballot to select into. */
export function CandidateProfileSheet({
  candidate,
  open,
  onOpenChange,
  isSelected,
  onSelect,
}: {
  candidate: PublicCandidateProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {candidate && (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">{candidate.fullName}</SheetTitle>
              <SheetDescription className="sr-only">Candidate profile</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4">
              <div className="relative aspect-4/5 w-full overflow-hidden rounded-lg bg-muted">
                <CandidatePhoto
                  photoUrl={candidate.photoUrl}
                  fullName={candidate.fullName}
                  sizes="(min-width: 640px) 28rem, 100vw"
                  initialsClassName="text-5xl"
                />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">#{candidate.candidateNumber}</p>
                <h2 className="font-heading text-lg font-semibold">{candidate.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  {candidate.programYear ? `${candidate.programYear} · ` : ""}
                  {candidate.categoryName}
                </p>
              </div>

              {candidate.tagline && (
                <p className="text-sm italic text-muted-foreground">&quot;{candidate.tagline}&quot;</p>
              )}

              {candidate.bio && <p className="text-sm whitespace-pre-wrap">{candidate.bio}</p>}
            </div>
            {onSelect && (
              <SheetFooter>
                <Button onClick={onSelect} variant={isSelected ? "secondary" : "default"} className="w-full">
                  {isSelected ? (
                    <>
                      <Check className="size-4" />
                      Selected — tap to remove
                    </>
                  ) : (
                    "Select this candidate"
                  )}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
