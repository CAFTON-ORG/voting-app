import { Skeleton } from "@/components/ui/skeleton";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

/** Shown the instant a voter clicks into an event - Next renders this
 * automatically while the page's data loads, so the click gets an
 * immediate response instead of a blank tab until the full page arrives.
 * Mirrors EventHero's current banner shape (a rounded aspect-video/2:1
 * box, not the old icon-tile-plus-text layout) and CandidatePreviewGrid's
 * per-category strips (a header row per category, not one flat grid) -
 * keeping this in sync with the real components matters here specifically,
 * since a skeleton with a visibly different shape than what replaces it
 * reads as a layout jump rather than a loading state. */
export default function EventLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-16">
        <div className="flex flex-col items-center gap-6 pt-8 pb-8 sm:pt-10">
          <Skeleton className="aspect-video w-full rounded-2xl sm:aspect-2/1" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-64 rounded-md" />
        </div>

        <div className="border-t pt-14">
          <div className="mb-6 flex items-center gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          {Array.from({ length: 2 }).map((_, categoryIndex) => (
            <div key={categoryIndex} className="mb-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-px flex-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex gap-5 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-4/5 w-36 shrink-0 rounded-2xl sm:w-44" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
