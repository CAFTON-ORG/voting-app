/** Lowercase, hyphenated, URL-safe form of a name — used to auto-derive an
 * event's slug from its name so admins never have to think about (or see)
 * a separate URL field. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
