import { Skeleton } from "@/components/ui/skeleton";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

export default function VoteLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-8 h-6 w-64" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-3/4 rounded-lg" />
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
