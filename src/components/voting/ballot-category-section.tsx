"use client";

import { RadioGroup } from "@/components/ui/radio-group";
import { BallotCandidateCard } from "./ballot-candidate-card";
import type { PublicCandidateProfile } from "./candidate-profile-sheet";
import type { CandidateCategory, Candidate } from "@prisma/client";

export function BallotCategorySection({
  category,
  selectedCandidateId,
  onSelect,
  onDeselect,
  onViewProfile,
  toProfile,
}: {
  category: CandidateCategory & { candidates: Candidate[] };
  selectedCandidateId: string | undefined;
  onSelect: (candidateId: string) => void;
  onDeselect: () => void;
  onViewProfile: (candidate: PublicCandidateProfile) => void;
  toProfile: (candidate: Candidate, categoryName: string) => PublicCandidateProfile;
}) {
  return (
    <div id={`category-${category.id}`} className="scroll-mt-20">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-base font-semibold tracking-wide uppercase">{category.name}</h2>
        <p className="text-xs text-muted-foreground">{category.candidates.length} candidates</p>
      </div>
      {category.description && <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>}
      <p className="mt-1 text-xs font-medium text-muted-foreground">Select exactly 1 candidate</p>

      <RadioGroup
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
        value={selectedCandidateId ?? ""}
        onValueChange={onSelect}
      >
        {category.candidates.map((candidate) => (
          <BallotCandidateCard
            key={candidate.id}
            candidate={toProfile(candidate, category.name)}
            selected={selectedCandidateId === candidate.id}
            onViewProfile={() => onViewProfile(toProfile(candidate, category.name))}
            onDeselect={onDeselect}
          />
        ))}
      </RadioGroup>
    </div>
  );
}
