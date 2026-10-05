import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

// A real, standalone page (not the sign-in modal in auth-page-shell.tsx) —
// Google Cloud's OAuth consent screen requires a publicly reachable Privacy
// Policy URL, hosted on the same domain as the app's own homepage, that
// comprehensively discloses what Google user data is accessed, how it's
// used, who it's shared with, how it's protected, and how long it's kept —
// see Google's "App Privacy Policy" verification guidance. Every section
// below maps directly to one of that guidance's required disclosures.
export const metadata = {
  title: "Privacy Policy — Cafton Voting",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated October 2026</p>
        <p className="mt-4 text-sm text-muted-foreground">
          This notice describes how <strong className="text-foreground">Cafton Voting</strong>, operated by{" "}
          <strong className="text-foreground">CAFTON</strong> as the voting technology partner for the
          University of Baguio School of Information Technology (SIT), accesses, uses, stores, and protects
          your Google Account information when you sign in to this platform at mmsit.cafton.com.
        </p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-heading text-lg font-semibold">What Google data we access</h2>
            <p className="mt-2 text-muted-foreground">
              When you sign in with Google, Cafton Voting receives your Google Account&apos;s{" "}
              <strong className="text-foreground">name, email address, and profile photo</strong>. We request
              nothing beyond these basic profile fields — no access to your Gmail, Drive, Calendar, Contacts,
              or any other Google service or data.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">How we use this information</h2>
            <p className="mt-2 text-muted-foreground">We use your Google Account information only to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Confirm you&apos;re an eligible voter for a given event, by checking your email&apos;s domain
                against that event&apos;s allowed domains.
              </li>
              <li>Confirm an administrator account is authorized to access the admin dashboard.</li>
              <li>Display your name and profile photo in the interface while you&apos;re signed in.</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              We do not use your information for advertising, to build user profiles beyond what&apos;s
              described above, to train generalized AI or machine-learning models, to sell to data brokers,
              or to assess creditworthiness or lending eligibility.
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
            <h2 className="font-heading text-lg font-semibold">Who we share information with</h2>
            <p className="mt-2 text-muted-foreground">
              We do not sell, rent, or share your personal information with third parties for their own
              independent use, and never for advertising, data-broker sale, or AI/ML model training. We do
              rely on a small number of infrastructure providers to operate the platform, each of which
              processes data only on our behalf and under their own security/confidentiality obligations:
              Supabase (authentication and database hosting), Vercel (application hosting), Resend
              (transactional admin-invitation emails only — never sent to voters), and Upstash (rate-limiting
              infrastructure). None of these providers are permitted to use your data for their own purposes.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">How we protect your data</h2>
            <p className="mt-2 text-muted-foreground">
              All traffic to and from this platform is encrypted in transit (HTTPS/TLS), and your data is
              encrypted at rest by our database provider. Access to voter and admin data is restricted to
              authorized administrators through role-based permissions enforced at the database level.{" "}
              <strong className="text-foreground">
                Your Google password or any other Google credential is never transmitted to, seen by, or
                stored by this platform at any point
              </strong>{" "}
              — sign-in happens entirely through Google&apos;s own systems.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Data retention and deletion</h2>
            <p className="mt-2 text-muted-foreground">
              We retain a record that your account participated in a given event — separate from your
              anonymous ballot — for as long as needed to prevent double-voting during that event and to
              support election-integrity audits afterward. We do not retain this data longer than is
              reasonably necessary for those purposes. You may request deletion or export of your personal
              data by contacting us below; we&apos;ll respond within a reasonable timeframe, except where a
              specific record must be kept longer to preserve the integrity of an election that has already
              concluded.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Changes to this notice</h2>
            <p className="mt-2 text-muted-foreground">
              If how we access, use, or share your Google data changes, we&apos;ll update this page and its
              &quot;Last updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">Contact us</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about this notice, or requests to access or delete your data, can be directed to{" "}
              <a href="mailto:contact@cafton.com" className="underline underline-offset-2 hover:text-foreground">
                contact@cafton.com
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
