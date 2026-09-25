import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLogLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-7 w-28" />
      <div className="flex justify-end">
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
