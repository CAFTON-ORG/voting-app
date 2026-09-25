export function EntityMetadata({
  createdByEmail,
  createdAt,
  updatedByEmail,
  updatedAt,
}: {
  createdByEmail?: string | null;
  createdAt?: Date | null;
  updatedByEmail?: string | null;
  updatedAt?: Date | null;
}) {
  // Nothing to show if we never captured a creator (e.g. events created
  // before this field existed) — silence, not a broken-looking "by —".
  if (!createdByEmail && !updatedByEmail) return null;

  const showUpdated =
    updatedByEmail && updatedAt && createdAt && updatedAt.getTime() !== createdAt.getTime();

  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      {createdByEmail && createdAt && (
        <p>
          Created by {createdByEmail} · {createdAt.toLocaleString()}
        </p>
      )}
      {showUpdated && (
        <p>
          Last edited by {updatedByEmail} · {updatedAt.toLocaleString()}
        </p>
      )}
    </div>
  );
}
