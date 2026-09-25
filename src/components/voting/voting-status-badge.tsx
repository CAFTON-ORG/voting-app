import { Badge } from "@/components/ui/badge";
import type { EventState } from "@prisma/client";

/** Voter-facing status language, deliberately separate from the admin
 * StatusBadge — a voter has no use for DRAFT/ARCHIVED/PAUSED distinctions,
 * only "can I vote right now or not." */
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
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Voting Closed
    </Badge>
  );
}
