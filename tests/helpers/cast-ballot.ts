import { testPrisma } from "./db";

export type Selection = { categoryId: string; candidateId: string };

export async function castBallot(params: {
  eventId: string;
  voterAuthUserId: string;
  voterEmail: string;
  selections: Selection[];
  accessCode?: string | null;
}) {
  const rows = await testPrisma.$queryRaw<{ submitted_at: Date; event_name: string }[]>`
    select * from cast_ballot(
      ${params.eventId}::uuid,
      ${params.voterAuthUserId}::uuid,
      ${params.voterEmail},
      ${JSON.stringify(params.selections)}::jsonb,
      ${params.accessCode ?? null}
    )
  `;
  return rows[0];
}

/** cast_ballot()'s custom SQLSTATEs (see prisma/migrations/..._rls_and_cast_ballot)
 * arrive nested inside Prisma's raw-query error wrapper, not as `err.code`
 * directly — confirmed empirically against the real driver adapter, not
 * assumed. Falls back to parsing `err.message` in case the wrapper shape
 * ever changes across Prisma versions. */
export function pgErrorCode(err: unknown): string | undefined {
  const anyErr = err as { meta?: { driverAdapterError?: { cause?: { code?: string } } }; message?: string };
  const nested = anyErr?.meta?.driverAdapterError?.cause?.code;
  if (nested) return nested;
  const match = anyErr?.message?.match(/Code: `(P\d+)`/);
  return match?.[1];
}
