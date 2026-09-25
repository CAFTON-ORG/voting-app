"use client";

import { LogOut, EllipsisVertical } from "lucide-react";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { signOutAction } from "@/actions/auth/sign-out";
import type { AdminRole } from "@prisma/client";

/** Sign out lives inside this menu, not as an always-visible button —
 * opens only on click, matching the rest of the admin's interaction
 * pattern for anything sensitive-looking. A DropdownMenuItem's onClick
 * fires as the menu is already closing, so it can't itself submit a form
 * synchronously — driving a hidden form via requestSubmit() sidesteps
 * that instead of fighting it. */
export function NavUser({ email, role }: { email: string; role: AdminRole }) {
  const { isMobile } = useSidebar();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <UserAvatar label={email} size="sm" />
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{email}</span>
              <span className="truncate text-xs text-muted-foreground">{role}</span>
            </div>
            <EllipsisVertical className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar label={email} size="sm" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{email}</span>
                  <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                    {role}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              const form = document.getElementById("sidebar-sign-out-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form id="sidebar-sign-out-form" action={signOutAction.bind(null, "/admin/login")} className="hidden" />
    </>
  );
}
