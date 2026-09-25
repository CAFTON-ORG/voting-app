import { getTrustedIdentity } from "@/lib/auth/identity";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AcceptInvitationButton } from "@/components/admin/accept-invitation-button";

export default async function AcceptInvitationPage() {
  const identity = await getTrustedIdentity();

  if (!identity) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">Accept admin invitation</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with the Google account that received the invitation.
        </p>
        <GoogleSignInButton redirectTo="/admin/accept-invitation" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Accept admin invitation</h1>
      <p className="text-sm text-muted-foreground">Signed in as {identity.email}.</p>
      <AcceptInvitationButton />
    </div>
  );
}
