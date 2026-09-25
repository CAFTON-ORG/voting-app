import { cn } from "cn";

/** A compact segmented bar rather than a wide named stepper — section 9's
 * own guidance: on mobile, a row of category-name steps either wraps
 * awkwardly or gets squeezed unreadably. This scales to any category
 * count without either problem. */
export function VotingProgress({
  total,
  completed,
}: {
  total: number;
  completed: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Voting Progress</span>
        <span>
          {completed} of {total} {total === 1 ? "category" : "categories"} completed
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < completed ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}
