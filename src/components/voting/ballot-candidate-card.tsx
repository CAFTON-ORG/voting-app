"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import type { PublicCandidateProfile } from "@/components/voting/candidate-profile-sheet";

/** The primary visual unit of the ballot — a real <label>+RadioGroupItem
 * pair underneath (not a styled <div>), so keyboard nav, screen-reader
 * "checked" announcements, and click-anywhere selection all come from
 * Radix's own RadioGroup semantics rather than being reimplemented here.
 * Selection state is deliberately redundant (icon + badge text + border +
 * background), never color alone. Deliberately just number + name — the
 * rest of a candidate's info (program, tagline, bio) lives one tap away
 * in the profile sheet instead of crowding the selection grid. */
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
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-muted/40"
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

        {/* A flat tint instead of scaling the photo on hover — scaling a
            fill-positioned image risks visible overflow/clipping at the
            card's rounded corners; this reads as "hovered" just as clearly
            without moving the image at all. */}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

        <Badge className="absolute top-2 left-2 shadow-sm" variant="secondary">
          #{candidate.candidateNumber}
        </Badge>

        {selected && (
          <div className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="size-4" />
          </div>
        )}

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 from-15% to-transparent px-3 pt-8 pb-2.5 transition-opacity",
            selected ? "opacity-100" : "opacity-90"
          )}
        >
          <p className="font-heading truncate font-semibold text-white">{candidate.fullName}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={(e) => {
            e.preventDefault();
            onViewProfile();
          }}
        >
          View Profile
        </Button>

        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        >
          {selected ? (
            <>
              <Check className="size-3.5" />
              Selected
            </>
          ) : (
            <>
              <span className="flex size-3.5 items-center justify-center rounded-full border border-current" />
              Select
            </>
          )}
        </div>
      </div>
    </label>
  );
}
