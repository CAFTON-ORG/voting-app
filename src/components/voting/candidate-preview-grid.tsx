"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CandidatePhoto } from "@/components/shared/candidate-photo";

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
 * grouped into one horizontally-scrolling strip per category (Mr. SIT,
 * Ms. SIT, ...) instead of one undifferentiated strip with a category
 * caption on every card, so "who's running for X" reads as its own
 * section rather than something to spot by scanning captions. Separate
 * from the admin CandidateCard (no edit actions, no admin data) and from
 * the ballot form's selection grid (this is browsing, not choosing, so it
 * never needs the RadioGroup/selected-state machinery). */
export function CandidatePreviewGrid({ candidates }: { candidates: PreviewCandidate[] }) {
  const [search, setSearch] = useState("");

  const filtered =
    search.trim().length === 0
      ? candidates
      : candidates.filter((c) => c.fullName.toLowerCase().includes(search.trim().toLowerCase()));

  // Grouped in first-seen order, which already matches each category's own
  // displayOrder - the page's query sorts categories before flattening
  // their candidates into this one array.
  const categories: { name: string; candidates: PreviewCandidate[] }[] = [];
  for (const candidate of filtered) {
    let group = categories.find((c) => c.name === candidate.categoryName);
    if (!group) {
      group = { name: candidate.categoryName, candidates: [] };
      categories.push(group);
    }
    group.candidates.push(candidate);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">Meet the Candidates</h2>
        {candidates.length > SEARCH_THRESHOLD && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates…"
              className="pl-8"
            />
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No candidates match &quot;{search}&quot;.</p>
      ) : (
        categories.map((category) => (
          <div key={category.name} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-heading shrink-0 text-base font-semibold">{category.name}</h3>
              <span aria-hidden className="h-px flex-1 bg-border" />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {category.candidates.length} candidate{category.candidates.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-2 scroll-px-6">
              {category.candidates.map((candidate) => (
                <div key={candidate.id} className="group flex w-36 shrink-0 snap-start flex-col gap-3 sm:w-44">
                  <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-muted shadow-sm transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-md">
                    <CandidatePhoto
                      photoUrl={candidate.photoUrl}
                      fullName={candidate.fullName}
                      sizes="(min-width: 640px) 11rem, 9rem"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
                    <p className="font-heading truncate font-medium">{candidate.fullName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
