import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReadinessItem } from "@/lib/events/readiness";

export function EventReadinessCard({ items }: { items: ReadinessItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Setup progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              {item.complete ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
