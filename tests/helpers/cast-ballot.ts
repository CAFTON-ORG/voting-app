import { testPrisma } from "./db";

export { pgErrorCode } from "../../src/lib/prisma/errors";

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
