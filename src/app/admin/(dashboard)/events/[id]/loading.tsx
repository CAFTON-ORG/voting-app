import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <div className="lg:col-span-8">
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
