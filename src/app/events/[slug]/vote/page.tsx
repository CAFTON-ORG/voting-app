import { notFound } from "next/navigation";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { isAllowedVoterEmail } from "@/lib/auth/eligibility";
import { getVotableEvent, hasVoterParticipated } from "@/lib/voting/queries";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SignedInBar } from "@/components/auth/signed-in-bar";
import { BallotForm } from "@/components/voting/ballot-form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default async function VotePage(props: PageProps<"/events/[slug]/vote">) {
  const { slug } = await props.params;
  const event = await getVotableEvent(slug);
  if (!event) notFound();

  const identity = await getTrustedIdentity();
  if (!identity) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your University of Baguio account to vote.
        </p>
        <GoogleSignInButton redirectTo={`/events/${slug}/vote`} />
      </div>
    );
  }

  const redirectTo = `/events/${slug}/vote`;

  if (!isAllowedVoterEmail(identity.email, event.allowedDomains)) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24">
        <Alert variant="destructive">
          <AlertTitle>Not eligible</AlertTitle>
          <AlertDescription>
            Only University of Baguio accounts (@s.ubaguio.edu or @e.ubaguio.edu) can vote in this
            event.
          </AlertDescription>
        </Alert>
        <SignedInBar email={identity.email} redirectTo={redirectTo} />
      </div>
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
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24 text-center">
        <div>
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
        <SignedInBar email={identity.email} redirectTo={redirectTo} />
      </div>
    );
  }

  const alreadyVoted = await hasVoterParticipated(event.id, identity.authUserId);
  if (alreadyVoted) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24 text-center">
        <div>
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You have already voted in this event. Thank you for participating.
          </p>
        </div>
        <SignedInBar email={identity.email} redirectTo={redirectTo} />
      </div>
    );
  }

  return <BallotForm event={event} signedInEmail={identity.email} />;
}
