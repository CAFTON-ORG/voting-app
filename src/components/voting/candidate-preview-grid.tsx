"use client";

import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type PreviewCandidate = {
  id: string;
  candidateNumber: number;
  fullName: string;
  photoUrl: string | null;
  tagline: string | null;
  categoryName: string;
};

// Below this, a search box is more clutter than help for a handful of names.
const SEARCH_THRESHOLD = 9;

/** A read-only "meet the candidates" gallery for the public event page —
 * a horizontally scrolling strip of photo tiles rather than a bordered
 * card grid, so candidates read as a gallery to browse, not a table to
 * scan. Separate from the admin CandidateCard (no edit actions, no admin
 * data) and from the ballot form's selection grid (this is browsing, not
 * choosing, so it never needs the RadioGroup/selected-state machinery). */
export function CandidatePreviewGrid({ candidates }: { candidates: PreviewCandidate[] }) {
  const [search, setSearch] = useState("");

  const filtered =
    search.trim().length === 0
      ? candidates
      : candidates.filter((c) => c.fullName.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      {candidates.length > SEARCH_THRESHOLD && (
        <div className="relative mx-auto w-full max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates…"
            className="pl-8"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No candidates match &quot;{search}&quot;.</p>
      ) : (
        <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2">
          {filtered.map((candidate) => (
            <div key={candidate.id} className="flex w-36 shrink-0 snap-start flex-col gap-3 sm:w-44">
              <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-muted transition-transform duration-300 ease-out hover:scale-[1.03]">
                {candidate.photoUrl ? (
                  <Image
                    src={candidate.photoUrl}
                    alt={candidate.fullName}
                    fill
                    sizes="(min-width: 640px) 11rem, 9rem"
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
              </div>
              <div>
                <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
                <p className="font-heading truncate font-medium">{candidate.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{candidate.categoryName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
