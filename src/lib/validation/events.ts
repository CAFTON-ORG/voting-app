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

export const rescheduleEventSchema = scheduleEventSchema;

export const createCategorySchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  displayOrder: z.number().int().default(0),
});

export const updateCategorySchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});

export const reorderCategoriesSchema = z.object({
  eventId: z.uuid(),
  orderedCategoryIds: z.array(z.uuid()).min(1),
});

export const createCandidateSchema = z.object({
  eventId: z.uuid(),
  categoryId: z.uuid(),
  candidateNumber: z.number().int().positive(),
  fullName: z.string().trim().min(1).max(200),
  programYear: z.string().trim().max(100).optional(),
  tagline: z.string().trim().max(280).optional(),
  bio: z.string().trim().max(2000).optional(),
  displayOrder: z.number().int().default(0),
});

/** Anytime except FINALIZED — none of these affect which candidate a
 * ballot references or how voters told candidates apart mid-election. */
export const updateCandidateLimitedSchema = z.object({
  candidateId: z.uuid(),
  fullName: z.string().trim().min(1).max(200).optional(),
  programYear: z.string().trim().max(100).optional(),
  tagline: z.string().trim().max(280).optional(),
  bio: z.string().trim().max(2000).optional(),
  displayOrder: z.number().int().optional(),
  photoUrl: z.url().optional(),
});

/** DRAFT/SCHEDULED only — changes what a candidate number/category means,
 * which is exactly the class of change that must never happen once voting
 * could have started. See assertStructuralChangesAllowed. */
export const updateCandidateStructuralSchema = z.object({
  candidateId: z.uuid(),
  categoryId: z.uuid(),
  candidateNumber: z.number().int().positive(),
});
