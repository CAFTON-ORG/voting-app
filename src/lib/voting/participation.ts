import "server-only";

import { prisma } from "@/lib/prisma/client";

export type VoterParticipationRow = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  votedAt: Date;
};

/** Shows who has voted (proves "this account participated") without ever
 * joining to Ballot/BallotSelection — that join is exactly what the
 * privacy design keeps impossible. auth.users isn't a Prisma model (it's
 * Supabase-managed), hence the raw join. Caller must have already
 * checked VIEW_VOTER_LIST — this function doesn't gate on its own. */
// A safety cap, not a real page size — the admin table below paginates
// client-side over whatever this returns. Without any bound, an event with
// a very large electorate would ship its entire voter list to the browser
// in one response on every page load.
const MAX_VOTER_ROWS = 5000;

export async function getVoterParticipations(eventId: string): Promise<VoterParticipationRow[]> {
  return prisma.$queryRaw<VoterParticipationRow[]>`
    select u.email as "email", u.raw_user_meta_data->>'full_name' as "fullName",
      u.raw_user_meta_data->>'avatar_url' as "avatarUrl", vp.voted_at as "votedAt"
    from voter_participations vp
    join auth.users u on u.id = vp.voter_auth_user_id
    where vp.event_id = ${eventId}::uuid
    order by vp.voted_at asc
    limit ${MAX_VOTER_ROWS}
  `;
}
