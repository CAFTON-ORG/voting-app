"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { BallotCandidateCard } from "./ballot-candidate-card";
import type { PublicCandidateProfile } from "./candidate-profile-sheet";
import type { CandidateCategory, Candidate } from "@prisma/client";

// Below this count, a search box is more clutter than help — matches the
// spec's own guidance not to add search to a category with a handful of
// candidates.
const SEARCH_THRESHOLD = 9;

export function BallotCategorySection({
  category,
  selectedCandidateId,
  onSelect,
  onViewProfile,
  toProfile,
}: {
  category: CandidateCategory & { candidates: Candidate[] };
  selectedCandidateId: string | undefined;
  onSelect: (candidateId: string) => void;
  onViewProfile: (candidate: PublicCandidateProfile) => void;
  toProfile: (candidate: Candidate, categoryName: string) => PublicCandidateProfile;
}) {
  const [search, setSearch] = useState("");

  const filtered =
    search.trim().length === 0
      ? category.candidates
      : category.candidates.filter((c) => c.fullName.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div id={`category-${category.id}`} className="scroll-mt-20">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-wide uppercase">{category.name}</h2>
        <p className="text-xs text-muted-foreground">{category.candidates.length} candidates</p>
      </div>
      {category.description && <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>}
      <p className="mt-1 text-xs font-medium text-muted-foreground">Select exactly 1 candidate</p>

      {category.candidates.length > SEARCH_THRESHOLD && (
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${category.name.toLowerCase()}…`}
            className="pl-8"
          />
        </div>
      )}

      <RadioGroup
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
        value={selectedCandidateId ?? ""}
        onValueChange={onSelect}
      >
        {filtered.map((candidate) => (
          <BallotCandidateCard
            key={candidate.id}
            candidate={toProfile(candidate, category.name)}
            selected={selectedCandidateId === candidate.id}
            onViewProfile={() => onViewProfile(toProfile(candidate, category.name))}
          />
        ))}
      </RadioGroup>

      {filtered.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No candidates match &quot;{search}&quot;.</p>
      )}
    </div>
  );
}
