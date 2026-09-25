import { CalendarDays } from "lucide-react";
import { getAvatarColor } from "@/lib/format/avatar-color";
import { cn } from "cn";

const SIZE_CLASS = { sm: "size-7", default: "size-9", lg: "size-12" };
const ICON_SIZE = { sm: "size-3.5", default: "size-4.5", lg: "size-6" };

/** An event has no photo of its own — this is a consistent icon chip
 * (colored by name, like UserAvatar) rather than initials, so an event's
 * identity reads distinctly from a person's at a glance. */
export function EventAvatar({
  name,
  size = "default",
  className,
}: {
  name: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const { bg, fg } = getAvatarColor(name);
  return (
    <div
      className={cn(SIZE_CLASS[size], "flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ backgroundColor: bg, color: fg }}
    >
      <CalendarDays className={ICON_SIZE[size]} />
    </div>
  );
}
