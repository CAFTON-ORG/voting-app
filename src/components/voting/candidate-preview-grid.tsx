"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CandidatePhoto } from "@/components/shared/candidate-photo";
import { CandidateProfileSheet } from "./candidate-profile-sheet";

type PreviewCandidate = {
  id: string;
  candidateNumber: number;
  fullName: string;
  photoUrl: string | null;
  programYear: string | null;
  tagline: string | null;
  bio: string | null;
  categoryName: string;
};

// Below this, a search box is more clutter than help for a handful of names.
const SEARCH_THRESHOLD = 9;
const SCROLL_STEP = 320;

/** A read-only "meet the candidates" gallery for the public event page —
 * grouped into one horizontally-scrolling strip per category (Mr. SIT,
 * Ms. SIT, ...) instead of one undifferentiated strip with a category
 * caption on every card, so "who's running for X" reads as its own
 * section rather than something to spot by scanning captions. Separate
 * from the admin CandidateCard (no edit actions, no admin data) and from
 * the ballot form's selection grid (this is browsing, not choosing, so it
 * never needs the RadioGroup/selected-state machinery). Owns no page-level
 * heading of its own - the caller wraps this in its own SectionHeader, the
 * same pattern used everywhere else on the public site. Clicking a photo
 * opens the same CandidateProfileSheet the ballot flow uses to show a full
 * profile - passed with no onSelect, which already makes it render as
 * pure read-only browsing (no "select this candidate" footer). */
export function CandidatePreviewGrid({ candidates }: { candidates: PreviewCandidate[] }) {
  const [search, setSearch] = useState("");
  const [openCandidate, setOpenCandidate] = useState<PreviewCandidate | null>(null);

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
      {candidates.length > SEARCH_THRESHOLD && (
        <div className="relative w-full max-w-xs sm:ml-auto">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates…"
            className="pl-8"
          />
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No candidates match &quot;{search}&quot;.</p>
      ) : (
        categories.map((category, categoryIndex) => (
          <CategoryStrip
            key={category.name}
            name={category.name}
            candidates={category.candidates}
            categoryIndex={categoryIndex}
            onSelect={setOpenCandidate}
          />
        ))
      )}

      <CandidateProfileSheet
        candidate={openCandidate}
        open={openCandidate !== null}
        onOpenChange={(open) => !open && setOpenCandidate(null)}
      />
    </div>
  );
}

/** Its own scroll container and prev/next state per category — a large-
 * screen mouse user has no swipe gesture, so without visible arrows a
 * strip wider than its column had no discoverable way to see the rest of
 * it (native scroll/swipe alone works fine on touch, but isn't obvious on
 * desktop). Each category needs its own atStart/atEnd pair since they're
 * independent scroll containers - a single shared state would show one
 * category's arrows as disabled/enabled based on a different category's
 * scroll position. */
function CategoryStrip({
  name,
  candidates,
  categoryIndex,
  onSelect,
}: {
  name: string;
  candidates: PreviewCandidate[];
  categoryIndex: number;
  onSelect: (candidate: PreviewCandidate) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Measures the real DOM overflow once mounted, rather than guessing from
  // candidate count - a strip that happens to just barely fit its column
  // shouldn't show arrows just because it has "enough" candidates to
  // usually overflow.
  useEffect(() => {
    updateEdges();
  }, [candidates.length]);

  function updateEdges() {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  function scrollByStep(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  }

  const showNav = !(atStart && atEnd);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h3 className="font-heading shrink-0 text-base font-semibold">{name}</h3>
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
        </span>
        {showNav && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => scrollByStep(-1)}
              disabled={atStart}
            >
              <ChevronLeft className="size-3.5" />
              <span className="sr-only">Scroll left</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => scrollByStep(1)}
              disabled={atEnd}
            >
              <ChevronRight className="size-3.5" />
              <span className="sr-only">Scroll right</span>
            </Button>
          </div>
        )}
      </div>
      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-2 scroll-px-6"
      >
        {candidates.map((candidate, candidateIndex) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onSelect(candidate)}
            className="flex w-36 shrink-0 snap-start flex-col gap-3 text-left sm:w-44"
          >
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-muted shadow-sm">
              <CandidatePhoto
                photoUrl={candidate.photoUrl}
                fullName={candidate.fullName}
                sizes="(min-width: 640px) 11rem, 9rem"
                // The very first photo on the page is this page's LCP
                // element - lazy-loading it (next/image's default) is
                // exactly backwards for that one image.
                priority={categoryIndex === 0 && candidateIndex === 0}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
              <p className="font-heading truncate font-medium">{candidate.fullName}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
