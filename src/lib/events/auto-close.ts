import "server-only";

import type { EventState } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

/** Voting closes itself once `votingClosesAt` passes, mirroring the manual
 * "Close Voting" transition in src/actions/events/state.ts but with no
 * acting admin — audited as a system action instead. cast_ballot() already
 * refuses ballots past this deadline regardless of Event.state, so this is
 * purely about keeping the state column (and everything that reads it —
 * dashboards, badges, the public page) in sync with reality. Runs
 * opportunistically whenever a page that cares loads an event, rather than
 * via a scheduled job: nothing here is security-sensitive, so a page visit
 * catching up a few minutes late is harmless, and it avoids standing up
 * scheduler infrastructure for a cosmetic state-freshness fix.
 *
 * `updateMany`'s WHERE clause makes the transition atomic and idempotent —
 * if two requests race, only the one that actually flips the row writes
 * the audit log entry. Returns whether it closed the event just now, so
 * the caller can reflect that in the same render instead of showing the
 * stale state for one more page load. */
export async function autoCloseIfExpired(event: {
  id: string;
  state: EventState;
  votingClosesAt: Date | null;
}): Promise<boolean> {
  if (event.state !== "OPEN" && event.state !== "PAUSED") return false;
  if (!event.votingClosesAt || event.votingClosesAt.getTime() > Date.now()) return false;

  const { count } = await prisma.event.updateMany({
    where: { id: event.id, state: { in: ["OPEN", "PAUSED"] } },
    data: { state: "CLOSED" },
  });
  if (count > 0) {
    await prisma.auditLog.create({
      data: { eventId: event.id, actorAdminId: null, action: "VOTING_AUTO_CLOSED", metadata: {} },
    });
    // Deliberately no revalidatePath/revalidateTag here - this runs during
    // a page's own render (not a Server Action), and calling a cache-
    // revalidation function mid-render is unsupported territory, not worth
    // risking a broken page load over. The public home/event queries are
    // cached for up to ~20s (src/lib/events/public-queries.ts), so the
    // status badge can lag the real deadline by that much in the worst
    // case. Cosmetic only: cast_ballot() enforces the real deadline
    // regardless of Event.state, so a stale badge was never a path to an
    // accepted late vote, just a delayed status update, and the caller
    // already reflects the just-closed state in its own render below.
  }
  return count > 0;
}
