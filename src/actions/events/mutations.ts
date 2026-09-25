"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { createEventSchema, editEventSchema, scheduleEventSchema } from "@/lib/validation/events";
import { ok, fail, toFriendlyMessage, type ActionResult } from "@/lib/actions/result";

export async function createEventAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    const data = createEventSchema.parse(input);

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          slug: data.slug,
          name: data.name,
          allowedDomains: data.allowedDomains,
          eligibilityMode: "DOMAIN_ONLY",
          state: "DRAFT",
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

/** DRAFT -> SCHEDULED. Schedule can only be (re-)set while still DRAFT —
 * per the approved state machine, changing the schedule once voting has
 * ever been OPEN is not a normal action. */
export async function scheduleEventAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    const data = scheduleEventSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
      if (event.state !== "DRAFT") {
        throw new Error("An event's schedule can only be set while it is in DRAFT.");
      }
      await tx.event.update({
        where: { id: data.eventId },
        data: {
          state: "SCHEDULED",
          votingOpensAt: data.votingOpensAt,
          votingClosesAt: data.votingClosesAt,
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

/** Hard delete, restricted to DRAFT/SCHEDULED — voting can only ever
 * happen while OPEN, so an event in either of those states structurally
 * cannot have any ballots yet. The ballot-count check is defense in
 * depth for that invariant, not the only thing enforcing it. Anything
 * that has ever been OPEN is never deletable, full stop — "close it"
 * (and eventually finalize) is the only path forward from there. */
export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (event.state !== "DRAFT" && event.state !== "SCHEDULED") {
        throw new Error(
          "Only events that have never opened for voting (DRAFT or SCHEDULED) can be deleted."
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
