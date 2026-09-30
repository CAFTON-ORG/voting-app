import { CalendarDays } from "lucide-react";
import { EventCoverPhoto } from "@/components/shared/event-cover-photo";
import { getAvatarColor } from "@/lib/format/avatar-color";
import { cn } from "cn";

const SIZE_CLASS = { sm: "size-7", default: "size-9", lg: "size-12" };
const ICON_SIZE = { sm: "size-3.5", default: "size-4.5", lg: "size-6" };
const SIZES_ATTR = { sm: "28px", default: "36px", lg: "48px" };
const LOGO_SIZE = { sm: 12, default: 16, lg: 22 };

/** An event's cover image, shown small - a real cover photo cropped into
 * a circle reads as broken/wrong (circles are for people; content like a
 * cover photo gets a rounded-rect, same distinction EventHero and the
 * home page's event cards already make at full size), so this is
 * rounded-md at every size, never rounded-full. Falls back to a colored
 * calendar-icon chip when there's no cover - kept as a per-event colored
 * icon rather than the CAFTON mark, deliberately: this renders once per
 * row in a table of many events, and every row showing the identical
 * logo would make them harder to tell apart at a glance, not easier. */
export function EventAvatar({
  name,
  coverImageUrl = null,
  size = "default",
  className,
}: {
  name: string;
  coverImageUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  if (coverImageUrl) {
    return (
      <div className={cn(SIZE_CLASS[size], "relative shrink-0 overflow-hidden rounded-md", className)}>
        <EventCoverPhoto
          coverImageUrl={coverImageUrl}
          name={name}
          sizes={SIZES_ATTR[size]}
          logoSize={LOGO_SIZE[size]}
          logoClassName="text-white/60"
        />
      </div>
    );
  }

  const { bg, fg } = getAvatarColor(name);
  return (
    <div
      className={cn(SIZE_CLASS[size], "flex shrink-0 items-center justify-center rounded-md", className)}
      style={{ backgroundColor: bg, color: fg }}
    >
      <CalendarDays className={ICON_SIZE[size]} />
    </div>
  );
}
