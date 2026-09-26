import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { NavUser } from "@/components/admin/nav-user";
import { AdminCommandMenu } from "@/components/admin/admin-command-menu";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/shared/logo";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  const workspaceItems = [{ href: "/admin", label: "Events" }];
  const managementItems = [
    { href: "/admin/team", label: "Team" },
    ...(roleCan(admin.role, "VIEW_AUDIT_LOG") ? [{ href: "/admin/audit-log", label: "Audit Log" }] : []),
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* size="lg" alone gives a 48px-tall row expanded and an
                  exact 32px square collapsed (size-8!/p-0!) - overridden
                  here to h-14/size-9! so a bigger 36px logo still has a
                  couple px of breathing room in both states instead of
                  exactly touching (or, sized any larger, clipping) the
                  edges. The label text also needs an explicit
                  group-data-[collapsible=icon]:hidden: this button's own
                  overflow-hidden clips it visually while the sidebar is
                  mid-collapse-animation, but does NOT stop it from being
                  in the layout (and visible) once fully collapsed, since
                  a flex child's text doesn't shrink below its own content
                  width by default - it has to be told to disappear. */}
              <SidebarMenuButton
                asChild
                size="lg"
                className="h-14 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-9!"
              >
                <Link href="/admin">
                  <Logo size={36} className="shrink-0" />
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-semibold tracking-tight">CAFTON</span>
                    <span className="text-xs text-muted-foreground">Voting Admin</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarNav items={workspaceItems} />
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarNav items={managementItems} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <NavUser email={admin.email} fullName={admin.fullName} avatarUrl={admin.avatarUrl} role={admin.role} />
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
