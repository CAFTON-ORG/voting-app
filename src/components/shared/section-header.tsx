import { Badge } from "@/components/ui/badge";

/** The one section-break pattern for the public site — a small uppercase
 * eyebrow label plus an optional count pill. Used for every top-level
 * section on the home page and the event page alike (each wrapped in its
 * own `border-t pt-14` by the caller), so "here's a new section" always
 * looks and reads the same regardless of which public page it's on. */
export function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{label}</h2>
      {count !== undefined && (
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      )}
    </div>
  );
}
