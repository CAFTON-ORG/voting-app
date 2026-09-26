import Image from "next/image";
import { Logo } from "@/components/shared/logo";
import { cn } from "cn";

/** The three-mark partnership strip (Cafton, SIT, SIT-SAC) used anywhere the
 * platform needs to show who stands behind it — the public footer, the
 * auth/login shell, and anywhere else branding is expected. Real logo files
 * live in public/logos/; only Cafton's is an inline SVG component (it's a
 * simple vector wordmark already, not something that needs a raster file). */
export function PartnerLogos({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
          <Logo size={20} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">CAFTON</span>
      </div>

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
