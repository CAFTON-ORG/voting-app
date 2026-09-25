import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Development-only mock data. Never run against a production database —
 * the slug below is deliberately distinguishable from the real event
 * ("mr-ms-sit-netizens-choice-2026" or whatever the real event's slug ends
 * up being) so it's never mistaken for production data.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const event = await prisma.event.upsert({
    where: { slug: "dev-test-event" },
    update: {},
    create: {
      slug: "dev-test-event",
      name: "[DEV] Test Netizen's Choice Event",
      eligibilityMode: "DOMAIN_ONLY",
      allowedDomains: ["s.ubaguio.edu", "e.ubaguio.edu"],
      state: "OPEN",
      votingOpensAt: new Date(Date.now() - 1000 * 60 * 60),
      votingClosesAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  const categoryData = [
    {
      name: "Mr. SIT",
      displayOrder: 1,
      candidates: [
        { candidateNumber: 1, fullName: "Dev Candidate A" },
        { candidateNumber: 2, fullName: "Dev Candidate B" },
      ],
    },
    {
      name: "Ms. SIT",
      displayOrder: 2,
      candidates: [
        { candidateNumber: 1, fullName: "Dev Candidate C" },
        { candidateNumber: 2, fullName: "Dev Candidate D" },
      ],
    },
  ];

  for (const cat of categoryData) {
    const category = await prisma.candidateCategory.upsert({
      where: { eventId_name: { eventId: event.id, name: cat.name } },
      update: {},
      create: { eventId: event.id, name: cat.name, displayOrder: cat.displayOrder },
    });

    for (const candidate of cat.candidates) {
      await prisma.candidate.upsert({
        where: {
          eventId_categoryId_candidateNumber: {
            eventId: event.id,
            categoryId: category.id,
            candidateNumber: candidate.candidateNumber,
          },
        },
        update: {},
        create: {
          eventId: event.id,
          categoryId: category.id,
          candidateNumber: candidate.candidateNumber,
          fullName: candidate.fullName,
        },
      });
    }
  }

  console.log(`Seeded dev event "${event.slug}" (${event.id})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
