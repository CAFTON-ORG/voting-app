import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

/** Admin login is deliberately a separate entry point from voter login —
 * no domain restriction here (Cafton/SIT staff won't have UB emails);
 * authorization comes entirely from an AdminUser row, checked by
 * requireAdmin() on every protected admin page/action, never from
 * reaching this page. */
export default function AdminLoginPage() {
  return (
    <AuthPageShell
      eyebrow="Cafton"
      title="Admin sign in"
      description="For authorized Cafton and event administrators only."
      footer="Voting Technology Partner — CAFTON"
    >
      <GoogleSignInButton redirectTo="/admin" label="Continue with Google" />
    </AuthPageShell>
  );
}
