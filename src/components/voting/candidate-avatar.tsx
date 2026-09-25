import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Real candidate photos aren't configured yet (pending official assets
 * and, later, a Storage/CDN decision — see project notes). Until then
 * every candidate shows this initials placeholder instead of a broken
 * image or blank space, so the ballot never looks unfinished. */
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
