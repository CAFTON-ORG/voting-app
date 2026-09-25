/** cast_ballot()'s custom SQLSTATEs (see
 * prisma/migrations/..._rls_and_cast_ballot/migration.sql) arrive nested
 * inside Prisma's raw-query error wrapper, not as `err.code` directly —
 * confirmed empirically against the real driver adapter, not assumed.
 * Falls back to parsing `err.message` in case the wrapper shape ever
 * changes across Prisma versions. */
export function pgErrorCode(err: unknown): string | undefined {
  const anyErr = err as {
    meta?: { driverAdapterError?: { cause?: { code?: string } } };
    message?: string;
  };
  const nested = anyErr?.meta?.driverAdapterError?.cause?.code;
  if (nested) return nested;
  const match = anyErr?.message?.match(/Code: `(P\d+)`/);
  return match?.[1];
}
