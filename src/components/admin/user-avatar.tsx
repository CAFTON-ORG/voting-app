import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format/initials";
import { getAvatarColor } from "@/lib/format/avatar-color";
import { cn } from "cn";

const SIZE_CLASS = { sm: "size-7 text-xs", default: "size-9 text-sm", lg: "size-12 text-base" };

export function UserAvatar({
  label,
  size = "default",
  className,
}: {
  /** Email or name — whatever identifies this account in the UI. */
  label: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const { bg, fg } = getAvatarColor(label);
  return (
    <Avatar className={cn(SIZE_CLASS[size], "shrink-0", className)}>
      <AvatarFallback className="font-medium" style={{ backgroundColor: bg, color: fg }}>
        {getInitials(label)}
      </AvatarFallback>
    </Avatar>
  );
}
