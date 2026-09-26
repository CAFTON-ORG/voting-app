import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";
import { LogoScene } from "@/components/shared/logo-scene";
import { Reveal } from "@/components/shared/reveal";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { CAFTON_WEBSITE_URL } from "@/lib/site";

// Lists live events — without this, Next prerenders the query result at
// build time (no dynamic API here to force dynamic rendering otherwise),
// baking in whatever events existed at deploy time until the next build.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [events, identity] = await Promise.all([
    prisma.event.findMany({ where: { state: "OPEN" }, orderBy: { createdAt: "desc" } }),
    getTrustedIdentity(),
  ]);

  return (
    <div className="relative flex min-h-svh flex-col">
      <AuroraGlow />
      <PublicHeader
        signedInEmail={identity?.email}
        signedInName={identity?.fullName}
        signedInAvatarUrl={identity?.avatarUrl}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <section className="flex flex-col items-center gap-6 pt-20 pb-16 text-center sm:pt-28">
          <Reveal>
            <LogoScene size={128} />
          </Reveal>
          <Reveal delayMs={100}>
            <p className="text-sm font-medium text-muted-foreground">
              University of Baguio · School of Information Technology
            </p>
          </Reveal>
          <Reveal delayMs={150} className="max-w-2xl">
            <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              Mr. &amp; Ms. SIT
              <br />
              <span className="bg-linear-to-r from-foreground via-foreground/70 to-foreground bg-clip-text text-transparent">
                Netizen&rsquo;s Choice
              </span>
            </h1>
          </Reveal>
          <Reveal delayMs={220}>
            <p className="max-w-md text-base text-muted-foreground">
              Secure, one-account-one-vote elections for University of Baguio students and employees — powered by{" "}
              <a
                href={CAFTON_WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                CAFTON
              </a>
              .
            </p>
          </Reveal>
        </section>

        <section className="border-t pt-12 pb-24">
          <h2 className="mb-6 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Open for voting
          </h2>
          {events.length === 0 ? (
            <Reveal
              delayMs={280}
              className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarClock className="size-5" />
              </div>
              <p className="text-base text-muted-foreground">Voting opens soon. Check back shortly.</p>
            </Reveal>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map((event, index) => (
                <Reveal key={event.id} delayMs={280 + index * 80}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-heading truncate text-xl font-medium sm:text-2xl">{event.name}</p>
                      <div className="mt-2">
                        <VotingStatusBadge state={event.state} />
                      </div>
                    </div>
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowUpRight className="size-5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
