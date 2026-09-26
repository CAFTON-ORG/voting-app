import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format/initials";
import { getAvatarColor } from "@/lib/format/avatar-color";

const MAX_VISIBLE = 5;

/** A quick "who's in this category" preview — the standard overlapping
 * avatar-stack pattern (shared ui/avatar.tsx AvatarGroup primitive), not a
 * bespoke one-off. Caps at MAX_VISIBLE faces with a "+N" overflow bubble
 * rather than growing unbounded for a category with dozens of candidates. */
export function CandidateAvatarStack({
  candidates,
}: {
  candidates: { id: string; fullName: string; photoUrl: string | null }[];
}) {
  if (candidates.length === 0) return null;

  const visible = candidates.slice(0, MAX_VISIBLE);
  const overflow = candidates.length - visible.length;

  return (
    <AvatarGroup>
      {visible.map((candidate) => {
        const { bg, fg } = getAvatarColor(candidate.fullName);
        return (
          <Avatar key={candidate.id} size="sm">
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
