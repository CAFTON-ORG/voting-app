export function EntityMetadata({
  createdByName,
  createdAt,
  updatedByName,
  updatedAt,
}: {
  createdByName?: string | null;
  createdAt?: Date | null;
  updatedByName?: string | null;
  updatedAt?: Date | null;
}) {
  // Nothing to show if we never captured a creator (e.g. events created
  // before this field existed) — silence, not a broken-looking "by —".
  if (!createdByName && !updatedByName) return null;

  const showUpdated =
    updatedByName && updatedAt && createdAt && updatedAt.getTime() !== createdAt.getTime();

  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      {createdByName && createdAt && (
        <p>
          Created by {createdByName} · {createdAt.toLocaleString()}
        </p>
      )}
      {showUpdated && (
        <p>
          Last edited by {updatedByName} · {updatedAt.toLocaleString()}
        </p>
      )}
    </div>
  );
}
