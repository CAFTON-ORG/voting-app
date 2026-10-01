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

/** How far through the voting window "now" is, 0-100 — kept out of the
 * page component's own body since reading the current time is an impure
 * call the React Compiler's purity rule flags inside a component/hook,
 * even in a Server Component where reading it once per request is exactly
 * the intended behavior. */
export function getElapsedPercent(opensAt: Date, closesAt: Date): number | null {
  const total = closesAt.getTime() - opensAt.getTime();
  if (total <= 0) return null;
  const elapsed = Date.now() - opensAt.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/** Same reasoning as getElapsedPercent — reading the current time inline
 * in a component body trips the React Compiler's purity rule, so any
 * "has this deadline already passed" check needs to go through a plain
 * lib function instead. */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/** Whether a vote could actually be cast right now - the same schedule
 * bounds cast_ballot() itself enforces (see the SQL function's own
 * voting_opens_at/voting_closes_at checks), re-derived here so every
 * page that decides whether to show "Vote Now" uses the identical
 * criteria the database will actually accept, not just Event.state.
 *
 * state === "OPEN" alone isn't sufficient: an admin can open voting
 * manually at any point during SCHEDULED, before votingOpensAt arrives
 * (there's no gate preventing that, by design - see EventStateActions).
 * Without this check, a voter could see a "Vote Now" button, complete an
 * entire ballot, and only then be rejected by cast_ballot() at the very
 * last step - confusing, and indistinguishable from an actual bug. */
export function isVotingActuallyOpen(event: {
  state: string;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
}): boolean {
  if (event.state !== "OPEN") return false;
  if (event.votingOpensAt && isFuture(event.votingOpensAt)) return false;
  if (event.votingClosesAt && !isFuture(event.votingClosesAt)) return false;
  return true;
}
