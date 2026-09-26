import { notFound } from "next/navigation";
import { Clock, PauseCircle, CircleCheck, CircleSlash } from "lucide-react";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { isAllowedVoterEmail } from "@/lib/auth/eligibility";
import { getVotableEvent, hasVoterParticipated } from "@/lib/voting/queries";
import { autoCloseIfExpired } from "@/lib/events/auto-close";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SignedInBar } from "@/components/auth/signed-in-bar";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { BallotForm } from "@/components/voting/ballot-form";
import { VotingUnavailableState } from "@/components/voting/voting-unavailable-state";
import { VotingCountdown } from "@/components/voting/voting-countdown";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default async function VotePage(props: PageProps<"/events/[slug]/vote">) {
  const { slug } = await props.params;
  const event = await getVotableEvent(slug);
  if (!event) notFound();
  if (await autoCloseIfExpired(event)) event.state = "CLOSED";

  const identity = await getTrustedIdentity();
  if (!identity) {
    return (
      <AuthPageShell title={event.name} description="Sign in with your University of Baguio account to vote.">
        <GoogleSignInButton redirectTo={`/events/${slug}/vote`} />
      </AuthPageShell>
    );
  }

  const redirectTo = `/events/${slug}/vote`;
  const signedInFooter = <SignedInBar email={identity.email} redirectTo={redirectTo} />;

  if (!isAllowedVoterEmail(identity.email, event.allowedDomains)) {
    return (
      <AuthPageShell title={event.name} footer={signedInFooter}>
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
        title="Voting hasn't opened yet."
        description={
          event.votingOpensAt
            ? `Voting begins ${event.votingOpensAt.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}.`
            : undefined
        }
        footer={signedInFooter}
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
        title="Voting is temporarily paused."
        description="Please check back shortly."
        footer={signedInFooter}
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
            ? `Voting closed on ${event.votingClosesAt.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}.`
            : "Thank you to everyone who participated."
        }
        footer={signedInFooter}
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
        title="Vote already submitted"
        description="Your vote for this event has already been recorded. Thank you for participating."
        footer={signedInFooter}
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
