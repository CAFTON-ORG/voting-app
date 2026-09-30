import "server-only";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { loadTestGuardFailed } from "@/lib/load-test/guard";

/** Read-only staging helper: hands k6 the real eventId/categoryId/
 * candidateId values it needs to build a valid castBallotAction payload
 * (see load-test/k6/voting-load-test.js) - these are real UUIDs generated
 * at data-setup time, not something a load-test script should hardcode
 * and have to update by hand every time the test event is reset.
 *
 * SAFETY: see src/lib/load-test/guard.ts. This only ever reads a
 * category/candidate structure (no ballots, no voter data), but it must
 * still never be reachable on the real production project - same rule as
 * every other route under src/app/api/load-test and src/app/api/test-auth. */
export async function GET(request: Request) {
  if (loadTestGuardFailed(request)) {
    return new NextResponse(null, { status: 404 });
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "?slug=<event-slug> is required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { displayOrder: "asc" },
        include: { candidates: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!event) {
    return NextResponse.json({ error: `No event with slug "${slug}"` }, { status: 404 });
  }

  return NextResponse.json({
    eventId: event.id,
    state: event.state,
    allowedDomains: event.allowedDomains,
    categories: event.categories.map((category) => ({
      categoryId: category.id,
      candidateIds: category.candidates.map((candidate) => candidate.id),
    })),
  });
}
