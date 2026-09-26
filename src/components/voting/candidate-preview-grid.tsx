"use client";

import { useRef, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
const SCROLL_STEP = 320;

/** A read-only "meet the candidates" gallery for the public event page —
 * a horizontally scrolling strip of photo tiles rather than a bordered
 * card grid, so candidates read as a gallery to browse, not a table to
 * scan. Separate from the admin CandidateCard (no edit actions, no admin
 * data) and from the ballot form's selection grid (this is browsing, not
 * choosing, so it never needs the RadioGroup/selected-state machinery).
 * Owns its own "Meet the Candidates" heading so the prev/next controls
 * can sit there, next to it, standard-carousel-style — not floating on
 * top of the photos, where they read as overlaying the cards. */
export function CandidatePreviewGrid({ candidates }: { candidates: PreviewCandidate[] }) {
  const [search, setSearch] = useState("");
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(candidates.length <= 4);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const filtered =
    search.trim().length === 0
      ? candidates
      : candidates.filter((c) => c.fullName.toLowerCase().includes(search.trim().toLowerCase()));

  function updateEdges() {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  function scrollBy(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  }

  const showNav = filtered.length > 0 && !(atStart && atEnd);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">Meet the Candidates</h2>
        {showNav && (
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" onClick={() => scrollBy(-1)} disabled={atStart}>
              <ChevronLeft className="size-4" />
              <span className="sr-only">Scroll left</span>
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => scrollBy(1)} disabled={atEnd}>
              <ChevronRight className="size-4" />
              <span className="sr-only">Scroll right</span>
            </Button>
          </div>
        )}
      </div>

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

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No candidates match &quot;{search}&quot;.</p>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-2 scroll-px-6"
        >
          {filtered.map((candidate) => (
            <div key={candidate.id} className="flex w-36 shrink-0 snap-start flex-col gap-3 sm:w-44">
              <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-muted">
                <CandidatePhoto
                  photoUrl={candidate.photoUrl}
                  fullName={candidate.fullName}
                  sizes="(min-width: 640px) 11rem, 9rem"
                />
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
