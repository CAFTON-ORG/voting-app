import { Building2, Landmark } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "cn";

/** The three-mark partnership strip (Cafton, SIT, SIT-SB) used anywhere the
 * platform needs to show who stands behind it — the public footer, the
 * auth/login shell, and anywhere else branding is expected. Only CAFTON has
 * a real mark right now; SIT and SIT-SB are dashed placeholder slots so
 * swapping in real logo images later is a one-line change, not a layout
 * change (see PublicFooter's original single-slot version this replaces). */
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
        <div
          className="flex size-11 items-center justify-center rounded-xl border border-dashed text-muted-foreground"
          title="School of Information Technology logo placeholder"
        >
          <Landmark className="size-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">SIT</span>
      </div>

      <div className="h-8 w-px bg-border" aria-hidden="true" />

      <div className="flex flex-col items-center gap-1.5">
        <div
          className="flex size-11 items-center justify-center rounded-xl border border-dashed text-muted-foreground"
          title="SIT Student Body logo placeholder"
        >
          <Building2 className="size-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">SIT-SB</span>
      </div>
    </div>
  );
}
