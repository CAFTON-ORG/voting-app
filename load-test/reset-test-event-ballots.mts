// Wipes every ballot/selection/participation row for ONE event, so the
// same pool of provisioned test voters can run through a fresh load test
// again without every attempt being an "already voted" rejection. Never
// touches the Event/Category/Candidate rows themselves, or any other
// event - this is scoped to a single eventId on purpose.
//
// Usage:
//   npx tsx --env-file=.env.staging load-test/reset-test-event-ballots.mts <eventId>

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const eventId = process.argv[2];
if (!eventId) {
  console.error("Usage: reset-test-event-ballots.mts <eventId>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 });
const prisma = new PrismaClient({ adapter });

async function main() {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true } });
  if (!event) {
    console.error(`No event with id ${eventId}`);
    process.exit(1);
  }

  const result = await prisma.$transaction(async (tx) => {
    // BallotSelection cascades from Ballot's own FK, but participation is
    // a separate table (see docs/security-boundaries.md - a ballot's
    // selections carry no voter identity; VoterParticipation is the only
    // place "this person already voted" is recorded).
    const ballots = await tx.ballot.deleteMany({ where: { eventId } });
    const participations = await tx.voterParticipation.deleteMany({ where: { eventId } });
    return { ballots: ballots.count, participations: participations.count };
  });

  console.log(`Reset "${event.name}" (${eventId}):`);
  console.log(`  deleted ${result.ballots} ballots, ${result.participations} participation records`);
  await prisma.$disconnect();
}

main();
