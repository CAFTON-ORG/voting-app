import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

/** Admin login is deliberately a separate entry point from voter login —
 * no domain restriction here (Cafton/SIT staff won't have UB emails);
 * authorization comes entirely from an AdminUser row, checked by
 * requireAdmin() on every protected admin page/action, never from
 * reaching this page. */
export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Admin sign in</h1>
      <p className="text-sm text-muted-foreground">
        For authorized Cafton and event administrators only.
      </p>
      <GoogleSignInButton redirectTo="/admin" label="Continue with Google" />
    </div>
  );
}
