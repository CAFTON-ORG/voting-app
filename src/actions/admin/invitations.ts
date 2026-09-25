"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { getTrustedIdentity } from "@/lib/auth/identity";

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "MODERATOR", "AUDITOR"]),
});

/** Revokes any existing PENDING invitation for the email first, so the
 * unique(email, status) constraint never blocks re-inviting someone —
 * ACCEPTED/REVOKED history for that email is preserved rather than
 * needing to be deleted first. */
export async function inviteAdminAction(input: unknown) {
  const admin = await requirePermission("MANAGE_ADMIN_USERS");
  const data = inviteSchema.parse(input);
  const email = data.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    await tx.adminInvitation.updateMany({
      where: { email, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const invitation = await tx.adminInvitation.create({
      data: {
        email,
        role: data.role,
        invitedById: admin.adminUserId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await tx.auditLog.create({
      data: {
        actorAdminId: admin.adminUserId,
        action: "ADMIN_INVITED",
        metadata: { email, role: data.role },
      },
    });

    return invitation;
  });
}

/** Called only after the invitee has fully authenticated via Google —
 * never before. That ordering is the whole safety property: there is no
 * weaker "click the link" step that grants access by itself (see
 * docs/security-boundaries.md and the AdminInvitation model comment). */
export async function acceptInvitationAction() {
  const identity = await getTrustedIdentity();
  if (!identity) {
    throw new Error("You must sign in with Google before accepting an invitation.");
  }
  const email = identity.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.adminInvitation.findFirst({
      where: { email, status: "PENDING" },
    });
    if (!invitation) {
      throw new Error("No pending invitation was found for this email.");
    }
    if (invitation.expiresAt < new Date()) {
      await tx.adminInvitation.update({ where: { id: invitation.id }, data: { status: "REVOKED" } });
      throw new Error("This invitation has expired. Ask an admin to send a new one.");
    }

    const existing = await tx.adminUser.findUnique({ where: { authUserId: identity.authUserId } });
    const adminUser = existing
      ? await tx.adminUser.update({
          where: { id: existing.id },
          data: { role: invitation.role, active: true },
        })
      : await tx.adminUser.create({
          data: { authUserId: identity.authUserId, role: invitation.role },
        });

    await tx.adminInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorAdminId: adminUser.id,
        action: "ADMIN_INVITATION_ACCEPTED",
        metadata: { role: invitation.role },
      },
    });

    return adminUser;
  });
}
