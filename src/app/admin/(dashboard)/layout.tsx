import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { NavUser } from "@/components/admin/nav-user";
import { AdminCommandMenu } from "@/components/admin/admin-command-menu";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  const navItems = [
    { href: "/admin", label: "Events" },
    { href: "/admin/team", label: "Team" },
    ...(roleCan(admin.role, "VIEW_AUDIT_LOG") ? [{ href: "/admin/audit-log", label: "Audit Log" }] : []),
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/admin" className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-sm font-semibold tracking-tight">CAFTON</span>
            <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              Voting Admin
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarNav items={navItems} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <NavUser email={admin.email} role={admin.role} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="max-w-sm flex-1">
            <AdminCommandMenu role={admin.role} />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-x-hidden p-6 sm:p-8 lg:p-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
