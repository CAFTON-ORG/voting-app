"use client";

import { LogOut } from "lucide-react";
import { UserAvatar } from "@/components/admin/user-avatar";
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

/** The public-site counterpart to the admin sidebar's NavUser — an avatar
 * that opens a small menu with the signed-in voter's name/email and a
 * sign-out action, in the public header rather than the admin sidebar.
 * Only rendered by PublicHeader when a voter is actually signed in. */
export function NavUserPopover({
  email,
  fullName,
  avatarUrl,
}: {
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}) {
  const label = fullName || email;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserAvatar label={email} imageUrl={avatarUrl} size="sm" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 rounded-lg" side="bottom" align="end" sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar label={email} imageUrl={avatarUrl} size="sm" />
                <div className="grid flex-1 leading-tight">
                  <span className="truncate font-medium">{label}</span>
                  {fullName && <span className="truncate text-xs text-muted-foreground">{email}</span>}
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              const form = document.getElementById("public-sign-out-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form id="public-sign-out-form" action={signOutAction.bind(null, "/")} className="hidden" />
    </>
  );
}
