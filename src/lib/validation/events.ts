import { z } from "zod";

export const createEventSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1).max(200),
  allowedDomains: z.array(z.string().trim().min(1)).min(1),
});

export const editEventSchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  allowedDomains: z.array(z.string().trim().min(1)).min(1),
  showPublicBallotCount: z.boolean(),
});

export const scheduleEventSchema = z
  .object({
    eventId: z.uuid(),
    votingOpensAt: z.coerce.date(),
    votingClosesAt: z.coerce.date(),
  })
  .refine((data) => data.votingClosesAt > data.votingOpensAt, {
    message: "Closing time must be after opening time",
    path: ["votingClosesAt"],
  });

export const createCategorySchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  displayOrder: z.number().int().default(0),
});

export const createCandidateSchema = z.object({
  eventId: z.uuid(),
  categoryId: z.uuid(),
  candidateNumber: z.number().int().positive(),
  fullName: z.string().trim().min(1).max(200),
  programYear: z.string().trim().max(100).optional(),
  tagline: z.string().trim().max(280).optional(),
  displayOrder: z.number().int().default(0),
});

export const updateCandidateLimitedSchema = z.object({
  candidateId: z.uuid(),
  tagline: z.string().trim().max(280).optional(),
  displayOrder: z.number().int().optional(),
  photoUrl: z.url().optional(),
});
