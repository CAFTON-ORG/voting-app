import { Skeleton } from "@/components/ui/skeleton";
import { DataTableToolbarSkeleton } from "@/components/admin/data-table-skeleton";

export default function AuditLogLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-7 w-32" />
      <DataTableToolbarSkeleton actions={<Skeleton className="h-9 w-44" />} />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
