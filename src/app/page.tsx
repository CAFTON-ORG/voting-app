import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";

// Lists live events — without this, Next prerenders the query result at
// build time (no dynamic API here to force dynamic rendering otherwise),
// baking in whatever events existed at deploy time until the next build.
export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await prisma.event.findMany({
    where: { state: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">University of Baguio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Mr. &amp; Ms. SIT — Netizen&rsquo;s Choice
        </h1>

        {events.length === 0 && (
          <p className="mt-4 max-w-sm text-base text-muted-foreground">
            Voting opens soon for eligible University of Baguio students and employees.
          </p>
        )}

        {events.length > 0 && (
          <ul className="mt-10 flex w-full max-w-sm flex-col gap-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium">{event.name}</p>
                  <VotingStatusBadge state={event.state} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
