"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { inviteAdminSchema } from "@/lib/validation/admin";
import { inviteAdminAction } from "@/actions/admin/invitations";
import { canInviteRole } from "@/lib/auth/permissions";
import type { AdminRole } from "@prisma/client";
import type { z } from "zod";

type FormValues = z.infer<typeof inviteAdminSchema>;

const ALL_ROLES: AdminRole[] = ["ADMIN", "MODERATOR", "AUDITOR"];

/** `viewerRole` caps which roles can actually be invited — a MODERATOR
 * can only invite an AUDITOR (strictly below), while an ADMIN can invite
 * any role, including a peer ADMIN. See canInviteRole in
 * lib/auth/permissions.ts for why that one case is a deliberate exception. */
export function AddMemberDialog({ viewerRole }: { viewerRole: AdminRole }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const invitableRoles = ALL_ROLES.filter((r) => canInviteRole(viewerRole, r));

  const form = useForm<FormValues>({
    resolver: zodResolver(inviteAdminSchema),
    mode: "onChange",
    defaultValues: { email: "", role: invitableRoles.includes("MODERATOR") ? "MODERATOR" : invitableRoles[0] },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await inviteAdminAction(values);
    if (result.ok) {
      if (result.data.emailSent) {
        toast.success("Invitation sent");
      } else {
        toast.warning("Invitation created, but the email couldn't be sent — share the accept link manually.");
      }
      setOpen(false);
      router.refresh();
    } else {
      setError(result.message);
      toast.error(result.message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-3.5" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Add member</DialogTitle>
              <DialogDescription>
                They&apos;ll get an email with a link to accept — signing in with the Google account this
                is sent to.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {invitableRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sending…" : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
