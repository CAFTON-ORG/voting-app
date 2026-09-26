import Image from "next/image";
import { Logo } from "@/components/shared/logo";
import { CAFTON_WEBSITE_URL } from "@/lib/site";
import { cn } from "cn";

/** The three-mark partnership strip (Cafton, SIT, SIT-SAC) used anywhere the
 * platform needs to show who stands behind it — the public footer, the
 * auth/login shell, and anywhere else branding is expected. Real logo files
 * live in public/logos/; only Cafton's is an inline SVG component (it's a
 * simple vector wordmark already, not something that needs a raster file).
 * Cafton's own mark links out to cafton.com — SIT/SIT-SAC don't get one,
 * since this app has no page to send that traffic to for them. */
export function PartnerLogos({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <a
        href={CAFTON_WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-80"
      >
        <div className="flex size-11 items-center justify-center">
          <Logo size={32} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">CAFTON</span>
      </a>

      <div className="h-8 w-px bg-border" aria-hidden="true" />

      <div className="flex flex-col items-center gap-1.5">
        <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white">
          <Image src="/logos/sit-logo.png" alt="School of Information Technology" fill sizes="2.75rem" className="object-contain p-1" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">SIT</span>
      </div>

      <div className="h-8 w-px bg-border" aria-hidden="true" />

      <div className="flex flex-col items-center gap-1.5">
        <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white">
          <Image src="/logos/sit-sac-logo.png" alt="SIT Student Activities Council" fill sizes="2.75rem" className="object-contain p-1" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">SIT-SAC</span>
      </div>
    </div>
  );
}
