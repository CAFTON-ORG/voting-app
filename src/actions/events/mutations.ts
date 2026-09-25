"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { createEventSchema, scheduleEventSchema } from "@/lib/validation/events";

export async function createEventAction(input: unknown) {
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
  return event;
}

/** DRAFT -> SCHEDULED. Schedule can only be (re-)set while still DRAFT —
 * per the approved state machine, changing the schedule once voting has
 * ever been OPEN is not a normal action. */
export async function scheduleEventAction(input: unknown) {
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
}
