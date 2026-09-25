/** Falls back to email-local-part initials when there's no display name
 * (this app only ever has an email — Google's name claim isn't stored). */
export function getInitials(label: string): string {
  const namePart = label.split("@")[0];
  const parts = namePart.split(/[.\s_-]+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return initials || "?";
}
