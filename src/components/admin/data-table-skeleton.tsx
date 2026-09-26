import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors DataTable's own toolbar layout (see data-table.tsx) — search on
 * the left, actions on the right, stacking to one column below sm —
 * rather than a fixed-width row that overflows a narrow viewport for the
 * moment before the real (responsive) toolbar mounts in its place. */
export function DataTableToolbarSkeleton({ actions }: { actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-9 w-full sm:max-w-xs" />
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
