import { notFound } from "next/navigation";
import { Clock, PauseCircle, CircleCheck, CircleSlash, ShieldX } from "lucide-react";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { isAllowedVoterEmail } from "@/lib/auth/eligibility";
import { getVotableEvent, hasVoterParticipated } from "@/lib/voting/queries";
import { autoCloseIfExpired, autoOpenIfDue } from "@/lib/events/auto-transitions";
import { isVotingActuallyOpen } from "@/lib/events/readiness";
import { formatSchedule } from "@/lib/format/datetime";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { BallotForm } from "@/components/voting/ballot-form";
import { VotingUnavailableState } from "@/components/voting/voting-unavailable-state";
import { VotingCountdown } from "@/components/voting/voting-countdown";
import { Badge } from "@/components/ui/badge";

export default async function VotePage(props: PageProps<"/events/[slug]/vote">) {
  const { slug } = await props.params;
  // getVotableEvent and getTrustedIdentity are independent (event lookup,
  // JWT verification) - running them in parallel removes one full DB/auth
  // round-trip from every vote-page load instead of paying for it twice.
  const [event, identity] = await Promise.all([getVotableEvent(slug), getTrustedIdentity()]);
  if (!event) notFound();
  if (await autoOpenIfDue(event)) event.state = "OPEN";
  if (await autoCloseIfExpired(event)) event.state = "CLOSED";

  if (!identity) {
    const signInDescription =
      event.allowedDomains.length === 1
        ? `Sign in with your @${event.allowedDomains[0]} account to vote.`
        : "Sign in with an eligible account to vote.";
    return (
      <AuthPageShell title={event.name} description={signInDescription} backHref={`/events/${slug}`}>
        <GoogleSignInButton redirectTo={`/events/${slug}/vote`} />
      </AuthPageShell>
    );
  }

  if (!isAllowedVoterEmail(identity.email, event.allowedDomains)) {
    return (
      <VotingUnavailableState
        icon={ShieldX}
        tone="destructive"
        title="Not eligible to vote"
        description={`${identity.email} isn't on the list of accounts eligible for ${event.name}.`}
        signedInEmail={identity.email}
        signedInName={identity.fullName}
        signedInAvatarUrl={identity.avatarUrl}
      >
        <div className="mt-1 flex flex-col items-center gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Eligible account{event.allowedDomains.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {event.allowedDomains.map((domain) => (
              <Badge key={domain} variant="secondary" className="font-mono">
                @{domain}
              </Badge>
            ))}
          </div>
        </div>
      </VotingUnavailableState>
    );
  }

  // Admins can open voting manually at any point during SCHEDULED, before
  // votingOpensAt arrives (there's no gate preventing that - only auto-open
  // is schedule-gated). So state === "OPEN" alone doesn't guarantee voting
  // has actually started yet - the SAME schedule bounds cast_ballot()
  // itself enforces have to be checked here too, or a voter can select
  // candidates, review, and submit, only to be rejected at the very last
  // step with a Postgres error that looks like a bug rather than "it's not
  // time yet." Showing the identical SCHEDULED experience in that case
  // (rather than something that implies the backend rejected them) is
  // accurate: from the voter's perspective it isn't open, regardless of
  // what an admin clicked early.
  const notYetOpen = event.state === "SCHEDULED" || (event.state === "OPEN" && !isVotingActuallyOpen(event));
  if (notYetOpen) {
    return (
      <VotingUnavailableState
        icon={Clock}
        tone="info"
        title="Voting hasn't opened yet."
        description={
          event.votingOpensAt
            ? `Voting begins ${formatSchedule(event.votingOpensAt)}.`
            : undefined
        }
        signedInEmail={identity.email}
        signedInName={identity.fullName}
        signedInAvatarUrl={identity.avatarUrl}
      >
        {event.votingOpensAt && <VotingCountdown target={event.votingOpensAt} label="Starts in" />}
      </VotingUnavailableState>
    );
  }

  if (event.state === "PAUSED") {
    return (
      <VotingUnavailableState
        icon={PauseCircle}
        tone="warning"
        title="Voting is temporarily paused."
        description="Please check back shortly."
        signedInEmail={identity.email}
        signedInName={identity.fullName}
        signedInAvatarUrl={identity.avatarUrl}
      />
    );
  }

  if (event.state === "CLOSED" || event.state === "FINALIZED") {
    return (
      <VotingUnavailableState
        icon={CircleSlash}
        title="Voting has ended."
        description={
          event.votingClosesAt
            ? `Voting closed on ${formatSchedule(event.votingClosesAt)}.`
            : "Thank you to everyone who participated."
        }
        signedInEmail={identity.email}
        signedInName={identity.fullName}
        signedInAvatarUrl={identity.avatarUrl}
      />
    );
  }

  const alreadyVoted = await hasVoterParticipated(event.id, identity.authUserId);
  if (alreadyVoted) {
    return (
      <VotingUnavailableState
        icon={CircleCheck}
        tone="success"
        title="Vote already submitted"
        description="Your vote for this event has already been recorded. Thank you for participating."
        signedInEmail={identity.email}
        signedInName={identity.fullName}
        signedInAvatarUrl={identity.avatarUrl}
      />
    );
  }

  return (
    <BallotForm
      event={event}
      signedInEmail={identity.email}
      voterName={identity.fullName}
      voterAvatarUrl={identity.avatarUrl}
    />
  );
}
