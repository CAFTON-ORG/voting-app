import "server-only";

import { prisma } from "@/lib/prisma/client";

export type VoterParticipationRow = { email: string; fullName: string | null; votedAt: Date };

/** Shows who has voted (proves "this account participated") without ever
 * joining to Ballot/BallotSelection — that join is exactly what the
 * privacy design keeps impossible. auth.users isn't a Prisma model (it's
 * Supabase-managed), hence the raw join. Caller must have already
 * checked VIEW_VOTER_LIST — this function doesn't gate on its own. */
export async function getVoterParticipations(eventId: string): Promise<VoterParticipationRow[]> {
  return prisma.$queryRaw<VoterParticipationRow[]>`
    select u.email as "email", u.raw_user_meta_data->>'full_name' as "fullName", vp.voted_at as "votedAt"
    from voter_participations vp
    join auth.users u on u.id = vp.voter_auth_user_id
    where vp.event_id = ${eventId}::uuid
    order by vp.voted_at asc
  `;
}
