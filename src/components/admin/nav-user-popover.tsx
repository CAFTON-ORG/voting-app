"use client";

import { LogOut } from "lucide-react";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/actions/auth/sign-out";
import type { AdminRole } from "@prisma/client";

/** Same avatar + email/role + sign-out pattern as NavUser (the sidebar
 * footer's version) but as a compact trigger for the top header bar —
 * account access shouldn't disappear when the sidebar is collapsed to
 * icons or, on mobile, closed entirely. */
export function NavUserPopover({ email, role }: { email: string; role: AdminRole }) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserAvatar label={email} size="sm" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 rounded-lg" side="bottom" align="end" sideOffset={8}>
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
              const form = document.getElementById("navbar-sign-out-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form id="navbar-sign-out-form" action={signOutAction.bind(null, "/admin/login")} className="hidden" />
    </>
  );
}
