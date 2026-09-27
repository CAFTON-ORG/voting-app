import { Skeleton } from "@/components/ui/skeleton";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

/** Shown the instant a voter clicks into the ballot - Next renders this
 * automatically while the page's async data (event, eligibility, whether
 * they've already voted) is still loading, so the click always gets an
 * immediate visual response instead of a blank tab. Mirrors BallotForm's
 * own "select" step shape (stepper, title, progress bar, one section per
 * category) since that's the most likely landing state - the sign-in/
 * ineligible/closed states are comparatively rare and much lighter, so
 * this is still a reasonable placeholder for those too. */
export default function VoteLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 pb-28">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-16" />
              {i < 2 && <Skeleton className="h-px flex-1" />}
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-6 w-56" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />

        <div className="mt-8 flex flex-col gap-10">
          {Array.from({ length: 2 }).map((_, categoryIndex) => (
            <div key={categoryIndex}>
              <div className="flex items-baseline justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-4/5 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />

      <div className="sticky bottom-0 border-t bg-background/95 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
}
