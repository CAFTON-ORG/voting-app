import { Skeleton } from "@/components/ui/skeleton";
import { DataTableToolbarSkeleton } from "@/components/admin/data-table-skeleton";

export default function TeamLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <DataTableToolbarSkeleton
        actions={
          <>
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </>
        }
      />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
