"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import type { PublicCandidateProfile } from "@/components/voting/candidate-profile-sheet";

/** The primary visual unit of the ballot — a real <label>+RadioGroupItem
 * pair underneath (not a styled <div>), so keyboard nav, screen-reader
 * "checked" announcements, and click-anywhere selection all come from
 * Radix's own RadioGroup semantics rather than being reimplemented here.
 * Selection state is deliberately redundant (icon + badge text + border +
 * background), never color alone. */
export function BallotCandidateCard({
  candidate,
  selected,
  onViewProfile,
}: {
  candidate: PublicCandidateProfile;
  selected: boolean;
  onViewProfile: () => void;
}) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/40"
      )}
    >
      <RadioGroupItem value={candidate.id} className="sr-only" />

      <div className="relative aspect-4/5 w-full bg-muted">
        {candidate.photoUrl ? (
          <Image
            src={candidate.photoUrl}
            alt={candidate.fullName}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-3xl font-semibold text-muted-foreground">
            {candidate.fullName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </div>
        )}
        {selected && (
          <div className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="size-4" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs font-medium text-muted-foreground">#{candidate.candidateNumber}</p>
        <p className="truncate font-medium">{candidate.fullName}</p>
        {candidate.programYear && (
          <p className="truncate text-xs text-muted-foreground">{candidate.programYear}</p>
        )}
        {candidate.tagline && (
          <p className="truncate text-xs italic text-muted-foreground">&quot;{candidate.tagline}&quot;</p>
        )}

        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto justify-start px-0 text-xs"
          onClick={(e) => {
            e.preventDefault();
            onViewProfile();
          }}
        >
          View Profile
        </Button>

        <div
          className={cn(
            "mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        >
          {selected ? (
            <>
              <Check className="size-4" />
              Selected
            </>
          ) : (
            <>
              <span className="flex size-4 items-center justify-center rounded-full border border-current" />
              Select Candidate
            </>
          )}
        </div>
      </div>
    </label>
  );
}
