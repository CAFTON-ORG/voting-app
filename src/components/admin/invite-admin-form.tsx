"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { inviteAdminAction } from "@/actions/admin/invitations";
import type { AdminRole } from "@prisma/client";

const ROLES: AdminRole[] = ["ADMIN", "MODERATOR", "AUDITOR"];

export function InviteAdminForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("MODERATOR");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await inviteAdminAction({ email, role });
        setEmail("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border p-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-role" className="text-sm font-medium">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as AdminRole)}
          className="rounded-md border p-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send Invitation"}
      </Button>
    </form>
  );
}
