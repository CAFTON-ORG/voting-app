import { PartnerLogos } from "@/components/shared/partner-logos";
import { CAFTON_WEBSITE_URL } from "@/lib/site";

export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-10 text-center">
        <PartnerLogos />
        <div>
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
          <p className="text-xs text-muted-foreground">University of Baguio · School of Information Technology</p>
        </div>
      </div>
    </footer>
  );
}
