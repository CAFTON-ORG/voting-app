import "server-only";

import { prisma } from "@/lib/prisma/client";

export async function getBallotCount(eventId: string) {
  return prisma.ballot.count({ where: { eventId } });
}

/** One grouped query instead of one COUNT per event — used by the admin
 * events list, which needs every event's count at once. Events with zero
 * ballots have no group row, so callers should default missing ids to 0. */
export async function getBallotCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  const rows = await prisma.ballot.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds } },
    _count: true,
  });
  return new Map(rows.map((row) => [row.eventId, row._count]));
}

/** Per-candidate tallies. The caller is responsible for checking
 * VIEW_LIVE_RESULTS/VIEW_FINAL_RESULTS as appropriate for the event's
 * current state before calling this — it does not gate on role or state
 * itself, since that decision belongs with the page rendering it. */
export async function getCandidateResults(eventId: string) {
  const categories = await prisma.candidateCategory.findMany({
    where: { eventId },
    orderBy: { displayOrder: "asc" },
    include: {
      candidates: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        include: { _count: { select: { selections: true } } },
      },
    },
  });

  return categories.map((category) => {
    const total = category.candidates.reduce((sum, c) => sum + c._count.selections, 0);
    return {
      id: category.id,
      name: category.name,
      totalVotes: total,
      candidates: category.candidates
        .map((candidate) => ({
          id: candidate.id,
          candidateNumber: candidate.candidateNumber,
          fullName: candidate.fullName,
          photoUrl: candidate.photoUrl,
          votes: candidate._count.selections,
          percentage: total > 0 ? Math.round((candidate._count.selections / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.votes - a.votes),
    };
  });
}
