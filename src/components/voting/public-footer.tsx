import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { PartnerLogos } from "@/components/shared/partner-logos";
import { CAFTON_WEBSITE_URL } from "@/lib/site";

/** Two tiers — brand + partner marks, then a divider, then fine print —
 * rather than one flat stack of centered text. There's no real public
 * nav to pad this out with (this site is just the home page and event
 * pages), so the structure comes from typographic/spatial hierarchy
 * instead of invented link columns. */
export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo size={22} aria-hidden="true" />
            <span className="text-sm font-bold tracking-tight uppercase">Cafton</span>
          </Link>
          <PartnerLogos />
        </div>
        <div className="flex flex-col items-center gap-1.5 border-t pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-muted-foreground">University of Baguio · School of Information Technology</p>
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
    </footer>
  );
}
