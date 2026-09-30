import { Badge } from "@/components/ui/badge";
import type { EventState } from "@prisma/client";

/** Voter-facing status language, deliberately separate from the admin
 * StatusBadge — a voter has no use for DRAFT/ARCHIVED distinctions, and
 * "Upcoming"/"Voting Open" reads better here than the admin's bare
 * "Scheduled"/"Open". Colors are still the same per-state palette as the
 * admin table's StatusBadge (see src/components/admin/status-badge.tsx),
 * so a status reads as the same status everywhere in the app, admin view
 * or public page. */
export function VotingStatusBadge({ state }: { state: EventState }) {
  if (state === "OPEN") {
    return (
      <Badge className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300" variant="outline">
        Voting Open
      </Badge>
    );
  }
  if (state === "SCHEDULED") {
    return (
      <Badge className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300" variant="outline">
        Upcoming
      </Badge>
    );
  }
  if (state === "PAUSED") {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300" variant="outline">
        Voting Paused
      </Badge>
    );
  }
  if (state === "FINALIZED") {
    return (
      <Badge className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300" variant="outline">
        Results Finalized
      </Badge>
    );
  }
  return (
    <Badge className="border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300" variant="outline">
      Voting Closed
    </Badge>
  );
}
