import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function AuthErrorPage() {
  return (
    <AuthPageShell
      title="Sign-in failed"
      description="Something went wrong while signing you in. Please try again."
    />
  );
}
