import { notFound } from "next/navigation";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { isAllowedVoterEmail } from "@/lib/auth/eligibility";
import { getVotableEvent, hasVoterParticipated } from "@/lib/voting/queries";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SignedInBar } from "@/components/auth/signed-in-bar";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { BallotForm } from "@/components/voting/ballot-form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default async function VotePage(props: PageProps<"/events/[slug]/vote">) {
  const { slug } = await props.params;
  const event = await getVotableEvent(slug);
  if (!event) notFound();

  const identity = await getTrustedIdentity();
  if (!identity) {
    return (
      <AuthPageShell title={event.name} description="Sign in with your University of Baguio account to vote.">
        <GoogleSignInButton redirectTo={`/events/${slug}/vote`} />
      </AuthPageShell>
    );
  }

  const redirectTo = `/events/${slug}/vote`;

  if (!isAllowedVoterEmail(identity.email, event.allowedDomains)) {
    return (
      <AuthPageShell title={event.name} footer={<SignedInBar email={identity.email} redirectTo={redirectTo} />}>
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

  if (event.state !== "OPEN") {
    const message =
      event.state === "CLOSED" || event.state === "FINALIZED"
        ? "Voting has closed for this event."
        : event.state === "PAUSED"
          ? "Voting is temporarily paused. Please check back shortly."
          : "Voting is not open yet.";
    return (
      <AuthPageShell
        title={event.name}
        description={message}
        footer={<SignedInBar email={identity.email} redirectTo={redirectTo} />}
      />
    );
  }

  const alreadyVoted = await hasVoterParticipated(event.id, identity.authUserId);
  if (alreadyVoted) {
    return (
      <AuthPageShell
        title={event.name}
        description="You have already voted in this event. Thank you for participating."
        footer={<SignedInBar email={identity.email} redirectTo={redirectTo} />}
      />
    );
  }

  return <BallotForm event={event} signedInEmail={identity.email} />;
}
