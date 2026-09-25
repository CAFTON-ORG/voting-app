import type { LucideIcon } from "lucide-react";

export function PageTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h1 className="flex items-center gap-2 text-xl font-semibold">
      <Icon className="size-5 text-muted-foreground" />
      {children}
    </h1>
  );
}
