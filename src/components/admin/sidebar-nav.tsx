"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ScrollText, type LucideIcon } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

type NavItem = { href: string; label: string };

// Icon components can't cross the Server -> Client boundary as props (see
// events-table.tsx's note on the same constraint), so the icon-per-route
// mapping lives here, in the client component, keyed by the plain string
// href the server actually sends down.
const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/team": Users,
  "/admin/audit-log": ScrollText,
};

/** "/admin" also covers every nested "/admin/events/..." workspace route,
 * so opening an event still shows "Events" as the active section instead
 * of nothing being highlighted. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/events");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = ICONS[item.href];
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild tooltip={item.label} isActive={isActive(pathname, item.href)}>
              <Link href={item.href}>
                {Icon && <Icon />}
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
