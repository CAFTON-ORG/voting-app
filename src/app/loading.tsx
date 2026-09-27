import { Skeleton } from "@/components/ui/skeleton";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

/** Shown while the home page's live event query is still loading - this
 * page is `force-dynamic` (always hits the DB fresh, no static fallback),
 * so without this there was nothing but a blank tab on a slow connection
 * or cold start. Mirrors the real layout's shape (hero, open-event banner
 * cards, closed-event rows) so the swap-in doesn't read as a layout jump. */
export default function HomeLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <section className="flex flex-col items-center gap-8 pt-20 pb-20 sm:pt-28 sm:pb-24">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="size-26 rounded-3xl" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex flex-col items-center gap-5">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-10 w-full max-w-lg" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-11 w-44 rounded-md" />
          <div className="grid w-full grid-cols-3 gap-3 rounded-2xl border bg-card/60 px-4 py-5 sm:gap-8 sm:px-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 px-2">
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </section>

        <section className="border-t pt-14 pb-16">
          <div className="mb-6 flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t pt-14 pb-24">
          <div className="mb-6 flex items-center gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card py-5 pr-5 pl-6">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <div className="mt-3 flex items-center gap-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="size-11 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
