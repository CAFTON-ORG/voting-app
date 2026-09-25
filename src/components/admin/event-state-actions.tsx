"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  openVotingAction,
  pauseVotingAction,
  resumeVotingAction,
  closeVotingAction,
  reopenVotingAction,
  finalizeEventAction,
} from "@/actions/events/state";
import type { EventState, AdminRole } from "@prisma/client";
import { roleCan } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/actions/result";

/** Buttons are shown based on the viewer's permissions purely for UX —
 * every action re-checks the same permission server-side via
 * requirePermission(), so hiding a button here is not the security
 * boundary (a direct action call without the right role still fails). */
export function EventStateActions({
  eventId,
  state,
  role,
}: {
  eventId: string;
  state: EventState;
  role: AdminRole;
}) {
  const can = (permission: Parameters<typeof roleCan>[1]) => roleCan(role, permission);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {state === "SCHEDULED" && can("OPEN_VOTING") && (
          <Button disabled={pending} onClick={() => run(() => openVotingAction(eventId))}>
            Open Voting
          </Button>
        )}
        {state === "OPEN" && can("PAUSE_VOTING") && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => pauseVotingAction(eventId))}>
            Pause Voting
          </Button>
        )}
        {state === "PAUSED" && can("RESUME_VOTING") && (
          <Button disabled={pending} onClick={() => run(() => resumeVotingAction(eventId))}>
            Resume Voting
          </Button>
        )}
        {(state === "OPEN" || state === "PAUSED") && can("CLOSE_VOTING") && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" disabled={pending}>
                Close Voting
              </Button>
            }
            title="Close voting for this event?"
            description="This can only be reopened afterward as a logged exception, not a normal action."
            confirmLabel="Close Voting"
            variant="destructive"
            onConfirm={() => run(() => closeVotingAction(eventId))}
          />
        )}
        {state === "CLOSED" && can("REOPEN_VOTING") && (
          <Button variant="outline" disabled={pending} onClick={() => setReopenOpen(true)}>
            Reopen Voting (exceptional)
          </Button>
        )}
        {state === "CLOSED" && can("FINALIZE_RESULTS") && (
          <ConfirmDialog
            trigger={<Button disabled={pending}>Finalize Results</Button>}
            title="Finalize results?"
            description="This cannot be undone through the dashboard. Results and candidates become permanently frozen."
            confirmLabel="Finalize"
            variant="destructive"
            onConfirm={() => run(() => finalizeEventAction(eventId))}
          />
        )}
      </div>

      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen voting?"
        variant="destructive"
        confirmLabel="Reopen Voting"
        description={
          <div className="flex flex-col gap-2 pt-1">
            <p>This is an exceptional action, logged to the audit trail. A reason is required.</p>
            <Label htmlFor="reopen-reason" className="sr-only">
              Reason
            </Label>
            <Textarea
              id="reopen-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this event being reopened?"
            />
          </div>
        }
        onConfirm={async () => {
          const result = await reopenVotingAction(eventId, reason);
          if (!result.ok) throw new Error(result.message);
          setReason("");
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
