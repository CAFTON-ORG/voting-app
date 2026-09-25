import "server-only";

/** Parses ALLOWED_VOTER_DOMAINS once. This is the default/fallback set —
 * the actual source of truth for a given vote is that event's own
 * `allowedDomains` column (events can theoretically differ), so callers
 * should pass the event's domains when checking eligibility for a
 * specific event and only fall back to this for contexts without an
 * event yet (e.g. generic "is this a UB account at all" checks). */
export function defaultAllowedDomains(): string[] {
  return (process.env.ALLOWED_VOTER_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** Both students and employees/faculty are eligible — this is a plain
 * domain-suffix check with no distinction between the two. Never accepts
 * a client-submitted email; always call with the email from
 * getTrustedIdentity(). */
export function isAllowedVoterEmail(email: string, allowedDomains: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  return allowedDomains.some((domain) => normalized.endsWith(`@${domain.toLowerCase()}`));
}
