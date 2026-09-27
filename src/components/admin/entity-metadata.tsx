import { UserAvatar } from "@/components/admin/user-avatar";
import { formatDateTime } from "@/lib/format/datetime";

export function EntityMetadata({
  createdByName,
  createdByAvatarUrl,
  createdAt,
  updatedByName,
  updatedByAvatarUrl,
  updatedAt,
  withAvatar = false,
}: {
  createdByName?: string | null;
  createdByAvatarUrl?: string | null;
  createdAt?: Date | null;
  updatedByName?: string | null;
  updatedByAvatarUrl?: string | null;
  updatedAt?: Date | null;
  /** Shows a small avatar next to each line — off by default since most
   * callers already show an avatar for the entity itself nearby (e.g. the
   * event header's EventAvatar) and don't need a second one for the actor. */
  withAvatar?: boolean;
}) {
  // Nothing to show if we never captured a creator (e.g. events created
  // before this field existed) — silence, not a broken-looking "by —".
  if (!createdByName && !updatedByName) return null;

  const showUpdated =
    updatedByName && updatedAt && createdAt && updatedAt.getTime() !== createdAt.getTime();

  return (
    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      {createdByName && createdAt && (
        <div className="flex items-center gap-2">
          {withAvatar && <UserAvatar label={createdByName} imageUrl={createdByAvatarUrl} size="sm" />}
          <p>
            Created by {createdByName} · {formatDateTime(createdAt)}
          </p>
        </div>
      )}
      {showUpdated && (
        <div className="flex items-center gap-2">
          {withAvatar && <UserAvatar label={updatedByName} imageUrl={updatedByAvatarUrl} size="sm" />}
          <p>
            Last edited by {updatedByName} · {formatDateTime(updatedAt)}
          </p>
        </div>
      )}
    </div>
  );
}
