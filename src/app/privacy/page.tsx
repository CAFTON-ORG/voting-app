import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

// A real, standalone page (not the sign-in modal in auth-page-shell.tsx) —
// Google Cloud's OAuth consent screen requires a publicly reachable Privacy
// Policy URL before it allows publishing out of Testing. Content mirrors
// the same claims shown in that modal, just as a page Google (and anyone
// else) can actually load without signing in first.
export const metadata = {
  title: "Privacy Notice — Cafton Voting",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Privacy Notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated October 2026</p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-heading text-lg font-semibold">What we collect</h2>
            <p className="mt-2 text-muted-foreground">
              When you sign in with Google, this platform receives your account&apos;s name, email address,
              and profile photo from Google. That&apos;s used only to verify who you are — confirming a
              voter&apos;s eligibility for a specific event, or an admin&apos;s access to the dashboard.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Your credentials are never seen by us</h2>
            <p className="mt-2 text-muted-foreground">
              Sign-in happens entirely through Google&apos;s own systems. Your Google password or any other
              credential is never transmitted to, seen by, or stored by this platform at any point.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Ballot privacy</h2>
            <p className="mt-2 text-muted-foreground">
              For elections specifically, your signed-in identity is stored completely separately from your
              ballot selections. There is no record anywhere — in this platform&apos;s database or
              otherwise — linking your account to who or what you voted for.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">What we keep, and for how long</h2>
            <p className="mt-2 text-muted-foreground">
              We keep a record that your account participated in a given event (so the system can prevent
              double-voting and support election-integrity audits), separate from the anonymous ballot
              itself. We don&apos;t use your information for marketing, and we don&apos;t sell or share it
              with third parties outside of operating this platform.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Questions</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about this notice can be directed to your event administrator, or to{" "}
              <a href="mailto:privacy@cafton.com" className="underline underline-offset-2 hover:text-foreground">
                privacy@cafton.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
