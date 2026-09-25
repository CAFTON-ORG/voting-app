import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

/** One place defining what every status in the app looks like — replaces
 * the STATE_VARIANT maps that were duplicated per page/table. Covers
 * event states, candidate active/inactive, and member/invitation status.
 * Each gets its own standard semantic color (green = live/active, amber =
 * pending/paused, red = expired/revoked, blue = scheduled, violet =
 * finalized, gray = draft/inactive/archived) instead of relying on the
 * base Badge's default/secondary/destructive palette, which reads as
 * mostly monochrome and doesn't distinguish e.g. DRAFT from CLOSED. */
export type StatusBadgeStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "PAUSED"
  | "CLOSED"
  | "FINALIZED"
  | "ARCHIVED"
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "EXPIRED"
  | "REVOKED";

const STATUS_CONFIG: Record<StatusBadgeStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700" },
  SCHEDULED: { label: "Scheduled", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900" },
  OPEN: { label: "Open", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-900" },
  PAUSED: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900" },
  CLOSED: { label: "Closed", className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700" },
  FINALIZED: { label: "Finalized", className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900" },
  ARCHIVED: { label: "Archived", className: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700" },
  ACTIVE: { label: "Active", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-900" },
  INACTIVE: { label: "Inactive", className: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700" },
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900" },
  EXPIRED: { label: "Expired", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900" },
  REVOKED: { label: "Revoked", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900" },
};

export function StatusBadge({ status }: { status: StatusBadgeStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
