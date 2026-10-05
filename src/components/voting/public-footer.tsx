import type { SVGProps } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { PartnerLogos } from "@/components/shared/partner-logos";
import { CAFTON_WEBSITE_URL } from "@/lib/site";

// This lucide-react version ships no brand/social marks at all - these are
// the standard simple-icons solid-glyph paths instead, so each is the
// actual recognizable logo rather than a generic placeholder.
function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-.297-.01-.557-.023-.748-.023-1.848 0-2.579.734-2.579 2.556v1.436h4.067l-.701 3.667h-3.366v7.98H9.101z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 0C8.74 0 8.333.014 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.014 8.333 0 8.74 0 12s.014 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.986 8.74 24 12 24s3.667-.014 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.058-1.28.072-1.687.072-4.947s-.014-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.014 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227a3.81 3.81 0 0 1-.9 1.382c-.42.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421a3.685 3.685 0 0 1-1.379-.9c-.42-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.885.9-1.38.42-.419.885-.694 1.38-.9.42-.166 1.065-.36 2.235-.42 1.275-.045 1.65-.06 4.86-.06zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.846-10.405a1.441 1.441 0 1 1-2.883.001 1.441 1.441 0 0 1 2.883-.001z" />
    </svg>
  );
}

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/profile.php?id=61593222069389", label: "Facebook", icon: FacebookIcon },
  { href: "https://www.instagram.com/cafton.official", label: "Instagram", icon: InstagramIcon },
  { href: "https://www.linkedin.com/company/cafton", label: "LinkedIn", icon: LinkedInIcon },
  { href: "https://www.tiktok.com/@cafton.official", label: "TikTok", icon: TikTokIcon },
];

/** Two tiers — brand/about + partner marks + socials, then a divider,
 * then fine print — rather than one flat stack of centered text. There's
 * no real public nav to pad this out with (this site is just the home
 * page and event pages), so the structure comes from typographic/spatial
 * hierarchy and a short "who's behind this" blurb instead of invented
 * link columns. */
export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-56 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Logo size={22} aria-hidden="true" />
              <span className="text-sm font-bold tracking-tight uppercase">Cafton</span>
            </Link>
            <p className="text-xs text-muted-foreground">Build Better. Solve Smarter.</p>
          </div>

          <div className="flex flex-col items-center gap-4 sm:items-end">
            <PartnerLogos />
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Cafton on ${label}`}
                  className="flex size-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 border-t pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-muted-foreground">University of Baguio · School of Information Technology</p>
          <div className="flex items-center gap-3">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <p className="text-xs text-muted-foreground">
              Voting Technology Partner —{" "}
              <a
                href={CAFTON_WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                CAFTON
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
