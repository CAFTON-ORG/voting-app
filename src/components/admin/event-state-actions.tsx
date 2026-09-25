"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  openVotingAction,
  pauseVotingAction,
  resumeVotingAction,
  closeVotingAction,
  reopenVotingAction,
  finalizeEventAction,
} from "@/actions/events/state";
import type { EventState } from "@prisma/client";
import type { Permission } from "@/lib/auth/permissions";

/** Buttons are shown based on the viewer's permissions purely for UX —
 * every action re-checks the same permission server-side via
 * requirePermission(), so hiding a button here is not the security
 * boundary (a direct action call without the right role still fails). */
export function EventStateActions({
  eventId,
  state,
  can,
}: {
  eventId: string;
  state: EventState;
  can: (permission: Permission) => boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showReopenForm, setShowReopenForm] = useState(false);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
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
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => pauseVotingAction(eventId))}
          >
            Pause Voting
          </Button>
        )}
        {state === "PAUSED" && can("RESUME_VOTING") && (
          <Button disabled={pending} onClick={() => run(() => resumeVotingAction(eventId))}>
            Resume Voting
          </Button>
        )}
        {(state === "OPEN" || state === "PAUSED") && can("CLOSE_VOTING") && (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (confirm("Close voting for this event? This can only be reopened as an exception.")) {
                run(() => closeVotingAction(eventId));
              }
            }}
          >
            Close Voting
          </Button>
        )}
        {state === "CLOSED" && can("REOPEN_VOTING") && !showReopenForm && (
          <Button variant="outline" disabled={pending} onClick={() => setShowReopenForm(true)}>
            Reopen Voting (exceptional)
          </Button>
        )}
        {state === "CLOSED" && can("FINALIZE_RESULTS") && (
          <Button
            disabled={pending}
            onClick={() => {
              if (confirm("Finalize results? This cannot be undone through the dashboard.")) {
                run(() => finalizeEventAction(eventId));
              }
            }}
          >
            Finalize Results
          </Button>
        )}
      </div>

      {showReopenForm && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
          <label className="text-sm font-medium" htmlFor="reopen-reason">
            Reason for reopening (required, logged to the audit trail)
          </label>
          <textarea
            id="reopen-reason"
            className="rounded-md border p-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={pending || !reason.trim()}
              onClick={() =>
                run(async () => {
                  await reopenVotingAction(eventId, reason);
                  setShowReopenForm(false);
                  setReason("");
                })
              }
            >
              Confirm Reopen
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => setShowReopenForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
