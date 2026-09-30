import { notFound } from "next/navigation";
import { Clock, PauseCircle, CircleCheck, CircleSlash } from "lucide-react";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { isAllowedVoterEmail } from "@/lib/auth/eligibility";
import { getVotableEvent, hasVoterParticipated } from "@/lib/voting/queries";
import { autoCloseIfExpired, autoOpenIfDue } from "@/lib/events/auto-transitions";
import { formatSchedule } from "@/lib/format/datetime";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SignedInBar } from "@/components/auth/signed-in-bar";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { BallotForm } from "@/components/voting/ballot-form";
import { VotingUnavailableState } from "@/components/voting/voting-unavailable-state";
import { VotingCountdown } from "@/components/voting/voting-countdown";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
    return (
      <AuthPageShell title={event.name} description="Sign in with your University of Baguio account to vote." backHref={`/events/${slug}`}>
        <GoogleSignInButton redirectTo={`/events/${slug}/vote`} />
      </AuthPageShell>
    );
  }

  if (!isAllowedVoterEmail(identity.email, event.allowedDomains)) {
    // AuthPageShell has no site header/account menu of its own (it's also
    // used pre-sign-in, where there's no identity to show one for) - this
    // is the one branch here where SignedInBar's sign-out link is the only
    // way out for a signed-in-but-ineligible voter, so it stays. Every
    // other branch below renders through VotingUnavailableState, which
    // does have PublicHeader's own account menu, making a second sign-out
    // link here redundant - see NavUserPopover.
    const redirectTo = `/events/${slug}/vote`;
    return (
      <AuthPageShell
        title={event.name}
        footer={<SignedInBar email={identity.email} redirectTo={redirectTo} />}
        backHref={`/events/${slug}`}
      >
        <Alert variant="destructive">
          <AlertTitle>Not eligible</AlertTitle>
          <AlertDescription>
            Only University of Baguio accounts (@s.ubaguio.edu or @e.ubaguio.edu) can vote in this
            event.
          </AlertDescription>
        </Alert>
      </AuthPageShell>
    );
  }

  if (event.state === "SCHEDULED") {
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
