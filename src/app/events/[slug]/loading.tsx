import { Skeleton } from "@/components/ui/skeleton";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

export default function EventLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-6 pb-16">
        <div className="flex flex-col items-center gap-5 pt-16">
          <Skeleton className="size-16 rounded-2xl" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-10 w-full max-w-xs rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-3/4 rounded-lg" />
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
