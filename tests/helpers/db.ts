import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// A separate client instance from the app's singleton (tests aren't a
// Next.js request context, so there's no hot-reload concern to guard
// against here).
export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Creates a fully OPEN, voting-ready event with two categories and two
 * candidates each, isolated from any other event (including the dev seed
 * data) by a random slug. Returns everything a test needs to build a
 * valid ballot, plus a teardown function. */
export async function createTestEvent(
  overrides: Partial<{ eligibilityMode: "DOMAIN_ONLY" | "DOMAIN_AND_ACCESS_CODE"; state: string }> = {}
) {
  const slug = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const event = await testPrisma.event.create({
    data: {
      slug,
      name: `[TEST] ${slug}`,
      eligibilityMode: overrides.eligibilityMode ?? "DOMAIN_ONLY",
      allowedDomains: ["s.ubaguio.edu", "e.ubaguio.edu"],
      state: (overrides.state as never) ?? "OPEN",
      votingOpensAt: new Date(Date.now() - 60_000),
      votingClosesAt: new Date(Date.now() + 60_000 * 60),
    },
  });

  const mrCategory = await testPrisma.candidateCategory.create({
    data: { eventId: event.id, name: "Mr. Test", displayOrder: 1 },
  });
  const msCategory = await testPrisma.candidateCategory.create({
    data: { eventId: event.id, name: "Ms. Test", displayOrder: 2 },
  });

  const mrCandidate = await testPrisma.candidate.create({
    data: { eventId: event.id, categoryId: mrCategory.id, candidateNumber: 1, fullName: "Test Mr A" },
  });
  const msCandidate = await testPrisma.candidate.create({
    data: { eventId: event.id, categoryId: msCategory.id, candidateNumber: 1, fullName: "Test Ms A" },
  });

  const validSelections = [
    { categoryId: mrCategory.id, candidateId: mrCandidate.id },
    { categoryId: msCategory.id, candidateId: msCandidate.id },
  ];

  return {
    event,
    mrCategory,
    msCategory,
    mrCandidate,
    msCandidate,
    validSelections,
    cleanup: () => testPrisma.event.delete({ where: { id: event.id } }), // cascades
  };
}

export function randomVoterId() {
  return crypto.randomUUID();
}
