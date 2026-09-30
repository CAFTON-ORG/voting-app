import "server-only";

import { prisma } from "@/lib/prisma/client";
import { readHomeEventsCache, readEventDetailCache } from "@/lib/cache/public-cache";
import type { Event, Candidate } from "@prisma/client";

// Scope, deliberately: this file only ever caches read-only, low-stakes
// PUBLIC DISPLAY data (the home page's event list, an event's own public
// candidate/category listing) - never anything a voting decision depends
// on. Ballot eligibility (getVotableEvent, hasVoterParticipated in
// src/lib/voting/queries.ts) must stay fully live on every request; caching
// "have I already voted" or "is this still open" for even a few seconds is
// exactly the staleness bug next.config.ts's staleTimes: { dynamic: 0 }
// exists to prevent. A short cache here only ever affects how quickly a
// name/photo/status badge update becomes visible to someone browsing, not
// whether a vote is accepted.
//
// Backed by Upstash Redis (src/lib/cache/public-cache.ts), not Next's
// unstable_cache/Data Cache - see that file's comment for why.

// 20s: long enough that a burst of simultaneous page loads (everyone
// checking "is voting open yet" at once) shares one DB round trip instead
// of one each, short enough that nobody perceives the list as stale.
// Every admin action that changes what this shows also explicitly
// invalidates this cache (see src/actions/events/*), so this window is a
// worst-case bound, not the normal update latency.
const HOME_REVALIDATE_SECONDS = 20;
const EVENT_DETAIL_REVALIDATE_SECONDS = 15;

// unstable_cache round-trips its result through JSON internally, so a
// Date field comes back out as a plain ISO string, not a Date instance -
// TypeScript's inferred return type doesn't reflect that, so this was
// silently wrong at runtime (a raw ISO string rendered in the UI, and
// worse, autoCloseIfExpired's votingClosesAt.getTime() call would throw
// outright for any OPEN/PAUSED event). Every Date-typed field read from a
// cached query goes through this immediately after the cache call, so the
// rest of the app can keep trusting its own TypeScript types.
function reviveDate(value: Date | string | null): Date | null {
  return value === null ? null : value instanceof Date ? value : new Date(value);
}

function reviveEventDates<T extends Pick<Event, "votingOpensAt" | "votingClosesAt" | "finalizedAt" | "createdAt" | "updatedAt" | "archivedAt">>(
  event: T
): T {
  return {
    ...event,
    votingOpensAt: reviveDate(event.votingOpensAt),
    votingClosesAt: reviveDate(event.votingClosesAt),
    finalizedAt: reviveDate(event.finalizedAt),
    createdAt: reviveDate(event.createdAt) as T["createdAt"],
    updatedAt: reviveDate(event.updatedAt) as T["updatedAt"],
    archivedAt: reviveDate(event.archivedAt),
  };
}

function reviveCandidateDates<T extends Pick<Candidate, "createdAt">>(candidate: T): T {
  return { ...candidate, createdAt: reviveDate(candidate.createdAt) as T["createdAt"] };
}

function fetchPublicHomeEvents() {
  return prisma.event.findMany({
    // Kept identical to the pre-cache query in src/app/page.tsx - see that
    // file for why each condition is there.
    where: { state: { in: ["OPEN", "CLOSED", "FINALIZED"] }, archivedAt: null },
    orderBy: [{ votingOpensAt: "desc" }, { createdAt: "desc" }],
    include: {
      candidates: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        select: { id: true, fullName: true, photoUrl: true },
      },
    },
  });
}

export async function getPublicHomeEvents() {
  const events = await readHomeEventsCache(HOME_REVALIDATE_SECONDS, fetchPublicHomeEvents);
  return events.map(reviveEventDates);
}

export type PublicHomeEvent = Awaited<ReturnType<typeof getPublicHomeEvents>>[number];

function fetchPublicEventDetail(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { displayOrder: "asc" },
        include: { candidates: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
      },
    },
  });
}

/** Keyed by slug, so each event's public page invalidates independently -
 * editing one event's name never evicts every other event's cached page. */
export async function getPublicEventDetail(slug: string) {
  const event = await readEventDetailCache(slug, EVENT_DETAIL_REVALIDATE_SECONDS, () => fetchPublicEventDetail(slug));
  if (!event) return event;
  return {
    ...reviveEventDates(event),
    categories: event.categories.map((category) => ({
      ...category,
      candidates: category.candidates.map(reviveCandidateDates),
    })),
  };
}
