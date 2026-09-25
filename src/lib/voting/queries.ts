import "server-only";

import { prisma } from "@/lib/prisma/client";

export async function getVotableEvent(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { displayOrder: "asc" },
        include: {
          candidates: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });
}

export async function hasVoterParticipated(eventId: string, voterAuthUserId: string) {
  const participation = await prisma.voterParticipation.findUnique({
    where: { eventId_voterAuthUserId: { eventId, voterAuthUserId } },
  });
  return !!participation;
}
