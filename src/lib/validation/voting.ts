import { z } from "zod";

export const castBallotSchema = z.object({
  eventId: z.uuid(),
  selections: z
    .array(
      z.object({
        categoryId: z.uuid(),
        candidateId: z.uuid(),
      })
    )
    // No real event needs anywhere close to this many categories -
    // cast_ballot() would reject a mismatched count anyway, but bounding
    // it here rejects an oversized payload before it's even serialized
    // into the query, rather than after.
    .min(1)
    .max(50),
  accessCode: z.string().trim().min(1).optional(),
});

export type CastBallotInput = z.infer<typeof castBallotSchema>;
