import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format/initials";
import { getAvatarColor } from "@/lib/format/avatar-color";

const MAX_VISIBLE = 5;

/** A quick "who's involved" preview — the standard overlapping avatar-
 * stack pattern (shared ui/avatar.tsx AvatarGroup primitive), not a
 * bespoke one-off. Caps at MAX_VISIBLE faces with a "+N" overflow bubble
 * rather than growing unbounded for a category/event with many
 * candidates. Lives in shared/ (not admin/) since it's used both on
 * admin category cards and on the public home page's event cards. */
export function CandidateAvatarStack({
  candidates,
  size = "sm",
}: {
  candidates: { id: string; fullName: string; photoUrl: string | null }[];
  size?: "sm" | "default" | "lg";
}) {
  if (candidates.length === 0) return null;

  const visible = candidates.slice(0, MAX_VISIBLE);
  const overflow = candidates.length - visible.length;

  return (
    <AvatarGroup>
      {visible.map((candidate) => {
        const { bg, fg } = getAvatarColor(candidate.fullName);
        return (
          <Avatar key={candidate.id} size={size}>
            {candidate.photoUrl && <AvatarImage src={candidate.photoUrl} alt={candidate.fullName} />}
            <AvatarFallback className="font-medium" style={{ backgroundColor: bg, color: fg }}>
              {getInitials(candidate.fullName)}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {overflow > 0 && <AvatarGroupCount>+{overflow}</AvatarGroupCount>}
    </AvatarGroup>
  );
}
