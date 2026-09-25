import { getTrustedIdentity } from "@/lib/auth/identity";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AcceptInvitationButton } from "@/components/admin/accept-invitation-button";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default async function AcceptInvitationPage() {
  const identity = await getTrustedIdentity();

  if (!identity) {
    return (
      <AuthPageShell
        eyebrow="Cafton"
        title="Accept admin invitation"
        description="Sign in with the Google account that received the invitation."
      >
        <GoogleSignInButton redirectTo="/admin/accept-invitation" />
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell eyebrow="Cafton" title="Accept admin invitation" description={`Signed in as ${identity.email}.`}>
      <AcceptInvitationButton />
    </AuthPageShell>
  );
}
