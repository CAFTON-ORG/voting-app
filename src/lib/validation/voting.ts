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
    .min(1),
  accessCode: z.string().trim().min(1).optional(),
});

export type CastBallotInput = z.infer<typeof castBallotSchema>;
