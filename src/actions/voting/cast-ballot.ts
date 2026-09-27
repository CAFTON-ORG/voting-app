"use server";

import { prisma } from "@/lib/prisma/client";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { isAllowedVoterEmail } from "@/lib/auth/eligibility";
import { castBallotSchema, type CastBallotInput } from "@/lib/validation/voting";
import { castBallotLimiter, checkRateLimit } from "@/lib/rate-limit/client";
import { pgErrorCode, ERROR_MESSAGES } from "./errors";

export type CastBallotResult =
  | { ok: true; submittedAt: string; eventName: string; reference: string }
  | { ok: false; message: string };

/** A receipt-style code derived from the ballot's own id — never from
 * anything voter- or selection-related, since Ballot carries neither (see
 * docs/security-boundaries.md). Safe to show and safe to lose; it's not
 * looked up anywhere, just a "something was recorded" reassurance. */
function toReference(ballotId: string): string {
  return `CAFTON-${ballotId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** The only place cast_ballot() is ever invoked. Implements the boundary
 * documented in docs/security-boundaries.md: trusted identity is
 * established here via Supabase Auth (never a client-submitted value)
 * and passed into the Postgres function as explicit parameters, because
 * a raw Prisma connection carries no JWT for auth.uid() to read inside
 * the function. Zod validates shape; the function itself re-validates
 * every business rule regardless (defense in depth — this action's own
 * checks are for a fast, friendly error, not the security boundary). */
export async function castBallotAction(input: CastBallotInput): Promise<CastBallotResult> {
  const parsed = castBallotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Your ballot could not be read. Please try again." };
  }

  const identity = await getTrustedIdentity();
  if (!identity) {
    return { ok: false, message: "You must be signed in with Google to vote." };
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event) {
    return { ok: false, message: "This event could not be found." };
  }
  if (!isAllowedVoterEmail(identity.email, event.allowedDomains)) {
    return { ok: false, message: "Your account is not eligible to vote in this event." };
  }

  // Keyed by the trusted server-verified identity + event, never a
  // client-submitted value or bare IP (which could be an entire campus
  // NAT) - a real duplicate vote is already impossible regardless (see
  // cast_ballot()'s own unique constraint), this is purely about not
  // letting a script hammer this endpoint with repeated attempts.
  const rateLimit = await checkRateLimit(castBallotLimiter, `${identity.authUserId}:${event.id}`);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      message: `Too many attempts. Please wait about ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s) and try again.`,
    };
  }

  try {
    const rows = await prisma.$queryRaw<{ ballot_id: string; submitted_at: Date; event_name: string }[]>`
      select * from cast_ballot(
        ${event.id}::uuid,
        ${identity.authUserId}::uuid,
        ${identity.email},
        ${JSON.stringify(parsed.data.selections)}::jsonb,
        ${parsed.data.accessCode ?? null}
      )
    `;
    const row = rows[0];
    return {
      ok: true,
      submittedAt: row.submitted_at.toISOString(),
      eventName: row.event_name,
      reference: toReference(row.ballot_id),
    };
  } catch (err) {
    const code = pgErrorCode(err);
    return { ok: false, message: ERROR_MESSAGES[code ?? ""] ?? "Your vote could not be submitted. Please try again." };
  }
}
