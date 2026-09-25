import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestEvent, randomVoterId, testPrisma } from "../helpers/db";
import { castBallot, pgErrorCode } from "../helpers/cast-ballot";

describe("cast_ballot() — voting integrity", () => {
  let ctx: Awaited<ReturnType<typeof createTestEvent>>;

  beforeEach(async () => {
    ctx = await createTestEvent();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("accepts a valid, complete ballot", async () => {
    const voterId = randomVoterId();
    const result = await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: voterId,
      voterEmail: "voter@s.ubaguio.edu",
      selections: ctx.validSelections,
    });

    expect(result.event_name).toBe(ctx.event.name);

    const ballots = await testPrisma.ballot.findMany({ where: { eventId: ctx.event.id } });
    expect(ballots).toHaveLength(1);
    const selections = await testPrisma.ballotSelection.findMany({
      where: { ballotId: ballots[0].id },
    });
    expect(selections).toHaveLength(2);

    // The privacy guarantee: no column anywhere on Ballot/BallotSelection
    // references the voter. Asserting the actual returned shape, not just
    // the schema, since a raw query bypassing Prisma's own type safety is
    // exactly the kind of place that guarantee could quietly break.
    expect(Object.keys(ballots[0])).not.toContain("voterAuthUserId");
  });

  it("rejects a second vote from the same account (duplicate vote)", async () => {
    const voterId = randomVoterId();
    await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: voterId,
      voterEmail: "voter@s.ubaguio.edu",
      selections: ctx.validSelections,
    });

    const err = await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: voterId,
      voterEmail: "voter@s.ubaguio.edu",
      selections: ctx.validSelections,
    }).catch((e) => e);

    expect(pgErrorCode(err)).toBe("P0014"); // ALREADY_VOTED

    const ballots = await testPrisma.ballot.findMany({ where: { eventId: ctx.event.id } });
    expect(ballots).toHaveLength(1); // still exactly one — the duplicate never persisted
  });

  it("allows exactly one ballot when the same account votes concurrently (race condition)", async () => {
    const voterId = randomVoterId();
    const attempts = Array.from({ length: 10 }, () =>
      castBallot({
        eventId: ctx.event.id,
        voterAuthUserId: voterId,
        voterEmail: "voter@s.ubaguio.edu",
        selections: ctx.validSelections,
      }).then(
        () => "ok" as const,
        (e) => pgErrorCode(e)
      )
    );

    const outcomes = await Promise.all(attempts);
    const successes = outcomes.filter((o) => o === "ok");
    const alreadyVoted = outcomes.filter((o) => o === "P0014");

    expect(successes).toHaveLength(1);
    expect(alreadyVoted).toHaveLength(9);

    const ballots = await testPrisma.ballot.findMany({ where: { eventId: ctx.event.id } });
    expect(ballots).toHaveLength(1);
    const participations = await testPrisma.voterParticipation.findMany({
      where: { eventId: ctx.event.id, voterAuthUserId: voterId },
    });
    expect(participations).toHaveLength(1);
  });

  it("rejects an email outside the allowed domains", async () => {
    const err = await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: randomVoterId(),
      voterEmail: "someone@gmail.com",
      selections: ctx.validSelections,
    }).catch((e) => e);

    expect(pgErrorCode(err)).toBe("P0013"); // DOMAIN_NOT_ALLOWED
  });

  it("accepts an employee/faculty domain identically to a student domain", async () => {
    const result = await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: randomVoterId(),
      voterEmail: "staff.member@e.ubaguio.edu",
      selections: ctx.validSelections,
    });
    expect(result.event_name).toBe(ctx.event.name);
  });

  it("rejects an incomplete ballot (missing a category)", async () => {
    const err = await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: randomVoterId(),
      voterEmail: "voter@s.ubaguio.edu",
      selections: [ctx.validSelections[0]],
    }).catch((e) => e);

    expect(pgErrorCode(err)).toBe("P0017"); // INCOMPLETE_BALLOT
  });

  it("rejects a candidate that belongs to a different event", async () => {
    const other = await createTestEvent();
    try {
      const err = await castBallot({
        eventId: ctx.event.id,
        voterAuthUserId: randomVoterId(),
        voterEmail: "voter@s.ubaguio.edu",
        selections: [
          { categoryId: ctx.mrCategory.id, candidateId: other.mrCandidate.id }, // wrong event
          ctx.validSelections[1],
        ],
      }).catch((e) => e);

      expect(pgErrorCode(err)).toBe("P0018"); // INVALID_CANDIDATE
    } finally {
      await other.cleanup();
    }
  });

  it("rejects a candidate submitted under the wrong category", async () => {
    const err = await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: randomVoterId(),
      voterEmail: "voter@s.ubaguio.edu",
      selections: [
        { categoryId: ctx.msCategory.id, candidateId: ctx.mrCandidate.id }, // Mr. candidate under Ms. category
        { categoryId: ctx.mrCategory.id, candidateId: ctx.msCandidate.id },
      ],
    }).catch((e) => e);

    expect(pgErrorCode(err)).toBe("P0018"); // INVALID_CANDIDATE
  });

  it("rejects a manipulated candidate ID that doesn't exist at all", async () => {
    const err = await castBallot({
      eventId: ctx.event.id,
      voterAuthUserId: randomVoterId(),
      voterEmail: "voter@s.ubaguio.edu",
      selections: [
        { categoryId: ctx.mrCategory.id, candidateId: "00000000-0000-0000-0000-000000000000" },
        ctx.validSelections[1],
      ],
    }).catch((e) => e);

    expect(pgErrorCode(err)).toBe("P0018"); // INVALID_CANDIDATE
  });

  it("rejects voting on a DRAFT event (before it opens)", async () => {
    const draft = await createTestEvent({ state: "DRAFT" });
    try {
      const err = await castBallot({
        eventId: draft.event.id,
        voterAuthUserId: randomVoterId(),
        voterEmail: "voter@s.ubaguio.edu",
        selections: draft.validSelections,
      }).catch((e) => e);

      expect(pgErrorCode(err)).toBe("P0012"); // EVENT_NOT_OPEN
    } finally {
      await draft.cleanup();
    }
  });

  it("rejects voting on a CLOSED event (after it closes)", async () => {
    const closed = await createTestEvent({ state: "CLOSED" });
    try {
      const err = await castBallot({
        eventId: closed.event.id,
        voterAuthUserId: randomVoterId(),
        voterEmail: "voter@s.ubaguio.edu",
        selections: closed.validSelections,
      }).catch((e) => e);

      expect(pgErrorCode(err)).toBe("P0012"); // EVENT_NOT_OPEN
    } finally {
      await closed.cleanup();
    }
  });

  it("rejects voting on a PAUSED event", async () => {
    const paused = await createTestEvent({ state: "PAUSED" });
    try {
      const err = await castBallot({
        eventId: paused.event.id,
        voterAuthUserId: randomVoterId(),
        voterEmail: "voter@s.ubaguio.edu",
        selections: paused.validSelections,
      }).catch((e) => e);

      expect(pgErrorCode(err)).toBe("P0012"); // EVENT_NOT_OPEN
    } finally {
      await paused.cleanup();
    }
  });

  it("rejects a request for an event that doesn't exist", async () => {
    const err = await castBallot({
      eventId: "00000000-0000-0000-0000-000000000000",
      voterAuthUserId: randomVoterId(),
      voterEmail: "voter@s.ubaguio.edu",
      selections: [],
    }).catch((e) => e);

    expect(pgErrorCode(err)).toBe("P0011"); // EVENT_NOT_FOUND
  });
});
