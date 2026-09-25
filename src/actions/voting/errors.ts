export { pgErrorCode } from "@/lib/prisma/errors";

/** Maps cast_ballot()'s SQLSTATEs (see the RLS/cast_ballot migration) to
 * copy a voter should actually see — never the raw Postgres message. */
export const ERROR_MESSAGES: Record<string, string> = {
  P0011: "This event could not be found.",
  P0012: "Voting is not currently open for this event.",
  P0013: "Your account is not eligible to vote in this event.",
  P0014: "This account has already voted in this event.",
  P0015: "An access code is required for this event.",
  P0016: "That access code is invalid, already used, or has been revoked.",
  P0017: "Please select exactly one candidate in every category.",
  P0018: "One of your selections is no longer valid. Please review your ballot.",
};
