import { Logo } from "@/components/shared/logo";

/** The one loading.tsx with no more specific route segment to override it
 * - it applies to every route that doesn't have its own (admin, auth,
 * unauthorized, as well as the home page), so it can't assume any
 * particular header or page shape. A page-specific skeleton here looked
 * fine for the public home page it was designed against, but showed up
 * just as literally while an admin route loaded too, with the wrong
 * header baked in and a layout nothing like the dashboard underneath it.
 * A neutral centered mark instead reads as "loading" everywhere it's
 * used, rather than as a wrong page flashing by. Routes that share one
 * real layout (the event/vote pages) still get their own accurate
 * skeleton - this one is deliberately generic. */
export default function RootLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Logo size={40} className="animate-pulse text-muted-foreground" />
    </div>
  );
}
