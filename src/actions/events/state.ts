"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { ok, fail, toFriendlyMessage, type ActionResult } from "@/lib/actions/result";

/** Every sensitive transition: permission check, current-state guard,
 * mutation + audit log in one Prisma transaction so they can't silently
 * diverge, then revalidate. No transition here ever touches a Ballot
 * row — only Event.state. Expected failures (wrong state, missing
 * reason) are returned, not thrown — see src/lib/actions/result.ts. */

export async function openVotingAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("OPEN_VOTING");
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "SCHEDULED") {
        throw new Error("Voting can only be opened from the SCHEDULED state.");
      }
      await tx.event.update({ where: { id: eventId }, data: { state: "OPEN" } });
      await tx.auditLog.create({
        data: { eventId, actorAdminId: admin.adminUserId, action: "VOTING_OPENED", metadata: {} },
      });
    });
    revalidatePath(`/admin/events/${eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err));
  }
}

export async function pauseVotingAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("PAUSE_VOTING");
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "OPEN") {
        throw new Error("Voting can only be paused while OPEN.");
      }
      await tx.event.update({ where: { id: eventId }, data: { state: "PAUSED" } });
      await tx.auditLog.create({
        data: { eventId, actorAdminId: admin.adminUserId, action: "VOTING_PAUSED", metadata: {} },
      });
    });
    revalidatePath(`/admin/events/${eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err));
  }
}

export async function resumeVotingAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("RESUME_VOTING");
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "PAUSED") {
        throw new Error("Voting can only be resumed from PAUSED.");
      }
      await tx.event.update({ where: { id: eventId }, data: { state: "OPEN" } });
      await tx.auditLog.create({
        data: { eventId, actorAdminId: admin.adminUserId, action: "VOTING_RESUMED", metadata: {} },
      });
    });
    revalidatePath(`/admin/events/${eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err));
  }
}

export async function closeVotingAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("CLOSE_VOTING");
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "OPEN" && event.state !== "PAUSED") {
        throw new Error("Voting can only be closed from OPEN or PAUSED.");
      }
      await tx.event.update({ where: { id: eventId }, data: { state: "CLOSED" } });
      await tx.auditLog.create({
        data: { eventId, actorAdminId: admin.adminUserId, action: "VOTING_CLOSED", metadata: {} },
      });
    });
    revalidatePath(`/admin/events/${eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err));
  }
}

/** The one exceptional path: ADMIN only, mandatory reason, always audited.
 * Never a casual toggle — see docs on the approved event state machine. */
export async function reopenVotingAction(eventId: string, reason: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("REOPEN_VOTING");
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return fail("A reason is required to reopen a closed event.");
    }
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "CLOSED") {
        throw new Error("Only a CLOSED event can be reopened.");
      }
      await tx.event.update({ where: { id: eventId }, data: { state: "OPEN" } });
      await tx.auditLog.create({
        data: {
          eventId,
          actorAdminId: admin.adminUserId,
          action: "VOTING_REOPENED",
          metadata: { reason: trimmedReason },
        },
      });
    });
    revalidatePath(`/admin/events/${eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err));
  }
}

/** No normal reversal exists for this — there is deliberately no
 * `unfinalizeEventAction`. An exceptional correction is a documented
 * manual recovery procedure, not a button. */
export async function finalizeEventAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("FINALIZE_RESULTS");
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "CLOSED") {
        throw new Error("Only a CLOSED event can be finalized.");
      }
      await tx.event.update({
        where: { id: eventId },
        data: { state: "FINALIZED", finalizedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { eventId, actorAdminId: admin.adminUserId, action: "RESULTS_FINALIZED", metadata: {} },
      });
    });
    revalidatePath(`/admin/events/${eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err));
  }
}
