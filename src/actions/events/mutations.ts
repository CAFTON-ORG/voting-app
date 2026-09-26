"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import {
  createEventSchema,
  editEventSchema,
  scheduleEventSchema,
  rescheduleEventSchema,
} from "@/lib/validation/events";
import { slugify } from "@/lib/format/slugify";
import { ok, fail, toFriendlyMessage, type ActionResult } from "@/lib/actions/result";

export async function createEventAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    const data = createEventSchema.parse(input);

    const event = await prisma.$transaction(async (tx) => {
      const base = slugify(data.name) || "event";
      let slug = base;
      for (let suffix = 2; await tx.event.findUnique({ where: { slug }, select: { id: true } }); suffix++) {
        slug = `${base}-${suffix}`;
      }

      const created = await tx.event.create({
        data: {
          slug,
          name: data.name,
          allowedDomains: data.allowedDomains,
          eligibilityMode: "DOMAIN_ONLY",
          state: "DRAFT",
          createdById: admin.adminUserId,
          updatedById: admin.adminUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          eventId: created.id,
          actorAdminId: admin.adminUserId,
          action: "EVENT_CREATED",
          metadata: { name: created.name, slug: created.slug },
        },
      });
      return created;
    });

    revalidatePath("/admin");
    return ok({ id: event.id });
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not create the event. Please check the fields and try again."));
  }
}

/** Name, allowed domains, and the public-ballot-count toggle can be
 * edited at any point before FINALIZED — none of these affect ballot
 * integrity (unlike candidates/categories, which lock once voting could
 * have started). */
export async function editEventAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    const data = editEventSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
      if (event.state === "FINALIZED") {
        throw new Error("This event's results have been finalized and its details are frozen.");
      }
      await tx.event.update({
        where: { id: data.eventId },
        data: {
          name: data.name,
          allowedDomains: data.allowedDomains,
          showPublicBallotCount: data.showPublicBallotCount,
          updatedById: admin.adminUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          eventId: data.eventId,
          actorAdminId: admin.adminUserId,
          action: "EVENT_UPDATED",
          metadata: { name: data.name },
        },
      });
    });

    revalidatePath(`/admin/events/${data.eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not save changes. Please try again."));
  }
}

/** DRAFT -> SCHEDULED. The *first* schedule can only be set while still
 * DRAFT — after that, adjusting it goes through rescheduleEventAction
 * below, which requires the event to already be SCHEDULED (not OPEN or
 * later) and logs old vs. new for the audit trail. */
export async function scheduleEventAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    const data = scheduleEventSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
      if (event.state !== "DRAFT") {
        throw new Error("An event's initial schedule can only be set while it is in DRAFT.");
      }
      await tx.event.update({
        where: { id: data.eventId },
        data: {
          state: "SCHEDULED",
          votingOpensAt: data.votingOpensAt,
          votingClosesAt: data.votingClosesAt,
          updatedById: admin.adminUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          eventId: data.eventId,
          actorAdminId: admin.adminUserId,
          action: "EVENT_SCHEDULED",
          metadata: { votingOpensAt: data.votingOpensAt, votingClosesAt: data.votingClosesAt },
        },
      });
    });

    revalidatePath(`/admin/events/${data.eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not save the schedule. Please try again."));
  }
}

/** Adjusts an already-SCHEDULED event's dates — deliberately only while
 * SCHEDULED, never OPEN/PAUSED/CLOSED/FINALIZED: once voting has ever
 * been open, silently moving the goalposts on when it was open is exactly
 * the kind of thing that must never happen without it being a completely
 * different, far more visible action (there isn't one — OPEN's schedule
 * is fixed once set). Logs old -> new so the audit trail shows the actual
 * change, not just the new values. */
export async function rescheduleEventAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    const data = rescheduleEventSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
      if (event.state !== "SCHEDULED") {
        throw new Error("The schedule can only be adjusted before voting opens.");
      }
      const previous = {
        votingOpensAt: event.votingOpensAt,
        votingClosesAt: event.votingClosesAt,
      };
      await tx.event.update({
        where: { id: data.eventId },
        data: {
          votingOpensAt: data.votingOpensAt,
          votingClosesAt: data.votingClosesAt,
          updatedById: admin.adminUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          eventId: data.eventId,
          actorAdminId: admin.adminUserId,
          action: "EVENT_RESCHEDULED",
          metadata: {
            previous,
            next: { votingOpensAt: data.votingOpensAt, votingClosesAt: data.votingClosesAt },
          },
        },
      });
    });

    revalidatePath(`/admin/events/${data.eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not reschedule the event."));
  }
}

/** Soft-hide, independent of `state` (see the Event.archivedAt schema
 * comment) — an archived CLOSED/FINALIZED event keeps all of its history
 * and results, it just drops out of the default events list. Restricted
 * to CLOSED/FINALIZED: archiving something still in progress would hide
 * an event voters or admins might still need to act on. */
export async function archiveEventAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "CLOSED" && event.state !== "FINALIZED") {
        throw new Error("Only a CLOSED or FINALIZED event can be archived.");
      }
      await tx.event.update({
        where: { id: eventId },
        data: { archivedAt: new Date(), updatedById: admin.adminUserId },
      });
      await tx.auditLog.create({
        data: { eventId, actorAdminId: admin.adminUserId, action: "EVENT_ARCHIVED", metadata: {} },
      });
    });
    revalidatePath("/admin");
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not archive the event."));
  }
}

export async function unarchiveEventAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (!event.archivedAt) {
        throw new Error("This event isn't archived.");
      }
      await tx.event.update({
        where: { id: eventId },
        data: { archivedAt: null, updatedById: admin.adminUserId },
      });
      await tx.auditLog.create({
        data: { eventId, actorAdminId: admin.adminUserId, action: "EVENT_UNARCHIVED", metadata: {} },
      });
    });
    revalidatePath("/admin");
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not restore the event."));
  }
}

/** Hard delete. Always requires zero ballots — the one invariant that
 * actually matters, since a Ballot row is the only thing that can be
 * lost. DRAFT/SCHEDULED events satisfy that structurally (they can never
 * have opened yet). An archived CLOSED/FINALIZED event may also qualify
 * if it turns out nobody ever voted (e.g. a test/duplicate event) — its
 * audit trail survives the delete via AuditLog.eventId's SetNull, so
 * nothing about its history is actually lost. A live OPEN/PAUSED event is
 * never eligible regardless of ballot count: it could still receive a
 * vote at any moment, so "currently zero" is not a stable guarantee. */
export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      const neverOpened = event.state === "DRAFT" || event.state === "SCHEDULED";
      const archivedAndDone = Boolean(event.archivedAt) && (event.state === "CLOSED" || event.state === "FINALIZED");
      if (!neverOpened && !archivedAndDone) {
        throw new Error(
          "Only a draft/scheduled event, or an archived event with no submitted ballots, can be deleted."
        );
      }
      const ballotCount = await tx.ballot.count({ where: { eventId } });
      if (ballotCount > 0) {
        throw new Error("This event already has submitted ballots and cannot be deleted.");
      }
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.adminUserId,
          action: "EVENT_DELETED",
          metadata: { name: event.name, slug: event.slug },
        },
      });
      await tx.event.delete({ where: { id: eventId } });
    });

    revalidatePath("/admin");
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not delete the event."));
  }
}
