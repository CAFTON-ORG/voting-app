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
        {/* SidebarHeader's own p-2 eats 16px of the collapsed rail's fixed
            48px width (--sidebar-width-icon) before the button even gets
            a turn - reduced to 4px a side when collapsed so a bigger icon
            actually has room, instead of being forced to overflow (which
            reads as "shoved off to one edge", not just clipped). */}
        <SidebarHeader className="group-data-[collapsible=icon]:px-1">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* size="lg" alone gives a 48px-tall row expanded and an
                  exact 32px square collapsed (size-8!/p-0!). Overridden to
                  h-16/size-10! (40px, exactly the width now available in
                  the collapsed rail after the header-padding fix above) so
                  a 36px logo centers with even clearance - justify-center
                  is the actual fix for the centering itself, since a lone
                  flex child otherwise sticks to the row's start edge, not
                  its middle, regardless of how much extra box width there is.
                  The label text also needs an explicit
                  group-data-[collapsible=icon]:hidden: this button's own
                  overflow-hidden clips it visually while the sidebar is
                  mid-collapse-animation, but does NOT stop it from being
                  in the layout (and visible) once fully collapsed, since
                  a flex child's text doesn't shrink below its own content
                  width by default - it has to be told to disappear. */}
              <SidebarMenuButton
                asChild
                size="lg"
                className="h-16 justify-center hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-10!"
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
