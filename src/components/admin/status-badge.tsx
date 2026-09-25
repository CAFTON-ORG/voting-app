import { Badge } from "@/components/ui/badge";

/** One place defining what every status in the app looks like — replaces
 * the STATE_VARIANT maps that were duplicated per page/table. Covers
 * event states, candidate active/inactive, and member/invitation status. */
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

const STATUS_CONFIG: Record<
  StatusBadgeStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  DRAFT: { label: "Draft", variant: "outline" },
  SCHEDULED: { label: "Scheduled", variant: "secondary" },
  OPEN: { label: "Open", variant: "default" },
  PAUSED: { label: "Paused", variant: "destructive" },
  CLOSED: { label: "Closed", variant: "secondary" },
  FINALIZED: { label: "Finalized", variant: "outline" },
  ARCHIVED: { label: "Archived", variant: "outline" },
  ACTIVE: { label: "Active", variant: "default" },
  INACTIVE: { label: "Inactive", variant: "outline" },
  PENDING: { label: "Pending", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  REVOKED: { label: "Revoked", variant: "destructive" },
};

export function StatusBadge({ status }: { status: StatusBadgeStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
