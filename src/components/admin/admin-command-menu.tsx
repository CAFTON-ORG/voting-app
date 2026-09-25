"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutDashboard, Users, ScrollText } from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { roleCan } from "@/lib/auth/permissions";
import type { AdminRole } from "@prisma/client";

/** Header's global search — opens on click or Ctrl/Cmd+K, jumps straight
 * to any admin page. Reads the same nav list the sidebar itself is built
 * from (see (dashboard)/layout.tsx) so the two never drift apart. */
export function AdminCommandMenu({ role }: { role: AdminRole }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const navItems = [
    { href: "/admin", label: "Events", icon: LayoutDashboard },
    { href: "/admin/team", label: "Team", icon: Users },
    ...(roleCan(role, "VIEW_AUDIT_LOG")
      ? [{ href: "/admin/audit-log", label: "Audit Log", icon: ScrollText }]
      : []),
  ];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border bg-transparent px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search pages…</span>
        <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          <span>⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search pages" description="Jump to any admin page">
        <Command>
          <CommandInput placeholder="Search pages…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Pages">
              {navItems.map((item) => (
                <CommandItem key={item.href} value={item.label} onSelect={() => goTo(item.href)}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
