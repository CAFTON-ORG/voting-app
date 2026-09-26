import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format/initials";
import { getAvatarColor } from "@/lib/format/avatar-color";
import { cn } from "cn";

const SIZE_CLASS = { sm: "size-7 text-xs", default: "size-9 text-sm", lg: "size-12 text-base" };

export function UserAvatar({
  label,
  imageUrl,
  size = "default",
  className,
}: {
  /** Email or name — whatever identifies this account in the UI. */
  label: string;
  /** Google's profile photo, when available — Radix's Avatar shows the
   * initials fallback automatically until this loads (or if it fails). */
  imageUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const { bg, fg } = getAvatarColor(label);
  return (
    <Avatar className={cn(SIZE_CLASS[size], "shrink-0", className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={label} />}
      <AvatarFallback className="font-medium" style={{ backgroundColor: bg, color: fg }}>
        {getInitials(label)}
      </AvatarFallback>
    </Avatar>
  );
}
