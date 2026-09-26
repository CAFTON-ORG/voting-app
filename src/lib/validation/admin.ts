import { z } from "zod";

export const inviteAdminSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(["ADMIN", "MODERATOR", "AUDITOR"]),
});

export const reopenVotingSchema = z.object({
  eventId: z.uuid(),
  reason: z.string().trim().min(1, "A reason is required to reopen a closed event"),
});
