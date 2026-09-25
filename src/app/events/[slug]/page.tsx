import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { getBallotCount } from "@/lib/results/queries";
import { Button } from "@/components/ui/button";

/** Public event page. Deliberately shows only a total ballot count (and
 * only when the event owner enabled it) — never candidate-level totals,
 * percentages, or rankings while voting is open, per the approved public
 * results policy. */
export default async function EventPage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.state === "DRAFT") notFound();

  const ballotCount = event.showPublicBallotCount ? await getBallotCount(event.id) : null;

  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">University of Baguio</p>
      <h1 className="mt-2 text-2xl font-semibold text-balance">{event.name}</h1>

      {ballotCount !== null && (
        <p className="mt-6 text-sm text-muted-foreground">
          {ballotCount.toLocaleString()} votes submitted
        </p>
      )}

      {event.state === "OPEN" && (
        <Button asChild className="mt-8 w-full">
          <Link href={`/events/${slug}/vote`}>Vote Now</Link>
        </Button>
      )}
      {event.state === "SCHEDULED" && (
        <p className="mt-8 text-sm text-muted-foreground">Voting has not opened yet.</p>
      )}
      {(event.state === "CLOSED" || event.state === "FINALIZED") && (
        <p className="mt-8 text-sm text-muted-foreground">Voting has closed.</p>
      )}
      {event.state === "PAUSED" && (
        <p className="mt-8 text-sm text-muted-foreground">Voting is temporarily paused.</p>
      )}

      <p className="mt-16 text-xs text-muted-foreground">
        Voting Technology Partner — <span className="font-medium text-foreground">CAFTON</span>
      </p>
    </div>
  );
}
