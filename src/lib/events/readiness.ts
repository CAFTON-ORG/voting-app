export type ReadinessItem = {
  key: string;
  label: string;
  complete: boolean;
};

type ReadinessInput = {
  name: string;
  allowedDomains: string[];
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  categories: { candidates: { isActive: boolean }[] }[];
};

/** Pure, no I/O — computed from data already on hand wherever it's called,
 * not a stored status. "Configure"/"Review" in the requested workflow are
 * this checklist, not new database states. */
export function getEventReadiness(event: ReadinessInput): { items: ReadinessItem[]; isReady: boolean } {
  const hasCategory = event.categories.length > 0;
  const everyCategoryHasCandidate = event.categories.every((c) => c.candidates.some((cd) => cd.isActive));

  const items: ReadinessItem[] = [
    { key: "details", label: "Event details complete", complete: Boolean(event.name) && event.allowedDomains.length > 0 },
    { key: "schedule", label: "Voting schedule configured", complete: Boolean(event.votingOpensAt && event.votingClosesAt) },
    { key: "categories", label: "At least one category exists", complete: hasCategory },
    {
      key: "candidates",
      label: "Every category has at least one candidate",
      complete: hasCategory && everyCategoryHasCandidate,
    },
  ];

  return { items, isReady: items.every((item) => item.complete) };
}
