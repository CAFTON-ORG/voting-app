"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";

type PreviewCandidate = {
  id: string;
  candidateNumber: number;
  fullName: string;
  photoUrl: string | null;
  tagline: string | null;
  categoryName: string;
};

const INITIAL_COUNT = 8;
const LOAD_MORE_COUNT = 8;

/** A read-only "meet the candidates" preview for the public event page —
 * separate from the admin CandidateCard (no edit actions, no admin data)
 * and from the ballot form's compact selection rows (this is browsing,
 * not choosing). "Load more" instead of numbered pages: simpler to use
 * on a public, unauthenticated page and just as effective for the sizes
 * these events run at. */
export function CandidatePreviewGrid({ candidates }: { candidates: PreviewCandidate[] }) {
  const [visible, setVisible] = useState(INITIAL_COUNT);
  const shown = candidates.slice(0, visible);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {shown.map((candidate) => (
          <div key={candidate.id} className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center">
            <CandidateAvatar photoUrl={candidate.photoUrl} fullName={candidate.fullName} className="size-16" />
            <div>
              <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
              <p className="font-medium">{candidate.fullName}</p>
              <p className="text-xs text-muted-foreground">{candidate.categoryName}</p>
            </div>
            {candidate.tagline && (
              <p className="text-xs italic text-muted-foreground">&quot;{candidate.tagline}&quot;</p>
            )}
          </div>
        ))}
      </div>
      {visible < candidates.length && (
        <Button variant="outline" className="self-center" onClick={() => setVisible((v) => v + LOAD_MORE_COUNT)}>
          Show more
        </Button>
      )}
    </div>
  );
}
