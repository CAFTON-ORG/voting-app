export default function AuthErrorPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">Sign-in failed</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong while signing you in. Please try again.
      </p>
    </div>
  );
}
