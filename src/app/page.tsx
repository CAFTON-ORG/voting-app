import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";
import { LogoScene } from "@/components/shared/logo-scene";
import { Reveal } from "@/components/shared/reveal";
import { AuroraGlow } from "@/components/shared/aurora-glow";

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
              Secure, one-account-one-vote elections for University of Baguio students and employees — powered by
              CAFTON.
            </p>
          </Reveal>
        </section>

        <section className="border-t pb-24">
          {events.length === 0 ? (
            <Reveal delayMs={280} className="py-16 text-center">
              <p className="text-base text-muted-foreground">Voting opens soon. Check back shortly.</p>
            </Reveal>
          ) : (
            <ul>
              {events.map((event, index) => (
                <Reveal key={event.id} delayMs={280 + index * 80}>
                  <li className="border-b">
                    <Link
                      href={`/events/${event.slug}`}
                      className="group flex items-center justify-between gap-4 py-7 transition-colors hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="font-heading truncate text-xl font-medium sm:text-2xl">{event.name}</p>
                        <div className="mt-2">
                          <VotingStatusBadge state={event.state} />
                        </div>
                      </div>
                      <ArrowUpRight className="size-6 shrink-0 text-muted-foreground transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                    </Link>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
