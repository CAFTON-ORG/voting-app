import { z } from "zod";

// No slug field — the URL slug is a purely internal identifier now, auto
// derived from the name and uniquified server-side in createEventAction.
// Admins never see or set it directly.
export const createEventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(200, "Keep it under 200 characters"),
  allowedDomains: z
    .array(z.string().trim().min(1))
    .min(1, "At least one allowed domain is required"),
  // No .default() here - the form's own defaultValues always sends a
  // real boolean (never omits the field), and z.boolean().default(...)
  // would otherwise make this field optional on input vs. required on
  // output, which breaks useForm's single shared FormValues type.
  showPublicBallotCount: z.boolean(),
});

export const editEventSchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(1, "Event name is required").max(200, "Keep it under 200 characters"),
  allowedDomains: z
    .array(z.string().trim().min(1))
    .min(1, "At least one allowed domain is required"),
  showPublicBallotCount: z.boolean(),
});

export const scheduleEventSchema = z
  .object({
    eventId: z.uuid(),
    // Plain z.date(), not z.coerce.date() — DateTimePicker only ever hands
    // this a real Date or undefined, never a string to coerce, and z.date()
    // keeps the form's TS types (Date, not unknown) matching what the
    // control actually passes around.
    votingOpensAt: z.date({ error: "An opening date/time is required" }),
    votingClosesAt: z.date({ error: "A closing date/time is required" }),
  })
  .refine((data) => data.votingClosesAt > data.votingOpensAt, {
    message: "Closing time must be after opening time",
    path: ["votingClosesAt"],
  });

export const rescheduleEventSchema = scheduleEventSchema;

export const createCategorySchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(1, "Category name is required").max(100, "Keep it under 100 characters"),
  description: z.string().trim().max(500, "Keep it under 500 characters").optional(),
  displayOrder: z.number().int().default(0),
});

export const updateCategorySchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(1, "Category name is required").max(100, "Keep it under 100 characters"),
  description: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

export const reorderCategoriesSchema = z.object({
  eventId: z.uuid(),
  orderedCategoryIds: z.array(z.uuid()).min(1),
});

// No candidateNumber here — createCandidateAction assigns the next number
// for the category automatically (server-side, from the current max), so
// it's never client input on create. Renumbering an existing candidate is
// still a deliberate, manual, separate action — see
// updateCandidateStructuralSchema below.
export const createCandidateSchema = z.object({
  eventId: z.uuid(),
  categoryId: z.uuid({ error: "Choose a category" }),
  fullName: z.string().trim().min(1, "Full name is required").max(200, "Keep it under 200 characters"),
  programYear: z.string().trim().max(100, "Keep it under 100 characters").optional(),
  displayOrder: z.number().int().default(0),
});

/** Anytime except FINALIZED — none of these affect which candidate a
 * ballot references or how voters told candidates apart mid-election. */
export const updateCandidateLimitedSchema = z.object({
  candidateId: z.uuid(),
  fullName: z.string().trim().min(1, "Full name is required").max(200, "Keep it under 200 characters").optional(),
  programYear: z.string().trim().max(100, "Keep it under 100 characters").optional(),
  displayOrder: z.number().int().optional(),
  photoUrl: z.url().optional(),
});

/** DRAFT/SCHEDULED only — changes what a candidate number/category means,
 * which is exactly the class of change that must never happen once voting
 * could have started. See assertStructuralChangesAllowed. */
export const updateCandidateStructuralSchema = z.object({
  candidateId: z.uuid(),
  categoryId: z.uuid({ error: "Choose a category" }),
  candidateNumber: z.coerce.number({ error: "A candidate number is required" }).int().positive("Must be a positive number"),
});
