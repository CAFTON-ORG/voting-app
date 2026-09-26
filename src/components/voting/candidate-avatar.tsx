import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Small inline candidate avatar (admin list rows, results tab) — shows
 * the real photo when one's been uploaded, falling back to initials
 * otherwise so a candidate with no photo yet never looks broken/unfinished. */
export function CandidateAvatar({
  photoUrl,
  fullName,
  className,
}: {
  photoUrl: string | null;
  fullName: string;
  className?: string;
}) {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <Avatar className={className}>
      {photoUrl && <AvatarImage src={photoUrl} alt={fullName} />}
      <AvatarFallback>{initials || "?"}</AvatarFallback>
    </Avatar>
  );
}
