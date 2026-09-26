"use server";

import { z } from "zod";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { getAdminUsersWithEmail, displayName } from "@/lib/admin/queries";
import { inviteAdminSchema } from "@/lib/validation/admin";
import { sendAdminInviteEmail } from "@/lib/email/resend";
import { ok, fail, toFriendlyMessage, type ActionResult } from "@/lib/actions/result";

async function getBaseUrl(): Promise<string> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/** True if `adminUserId` is the only active ADMIN — used to block actions
 * that would leave the system with no one able to manage it at all. */
async function isLastActiveAdmin(tx: Prisma.TransactionClient, adminUserId: string): Promise<boolean> {
  const target = await tx.adminUser.findUnique({ where: { id: adminUserId } });
  if (!target || target.role !== "ADMIN" || !target.active) return false;
  const otherActiveAdmins = await tx.adminUser.count({
    where: { role: "ADMIN", active: true, id: { not: adminUserId } },
  });
  return otherActiveAdmins === 0;
}

/** Revokes any existing PENDING invitation for the email first, so the
 * unique(email, status) constraint never blocks re-inviting someone —
 * ACCEPTED/REVOKED history for that email is preserved rather than
 * needing to be deleted first. */
export async function inviteAdminAction(input: unknown): Promise<ActionResult<{ emailSent: boolean }>> {
  try {
    const admin = await requirePermission("MANAGE_ADMIN_USERS");
    const data = inviteAdminSchema.parse(input);
    const email = data.email.trim().toLowerCase();

    const existingAdmins = await getAdminUsersWithEmail();
    if (existingAdmins.some((a) => a.active && a.email.toLowerCase() === email)) {
      return fail("This email already belongs to an active team member.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.adminInvitation.updateMany({
        where: { email, status: "PENDING" },
        data: { status: "REVOKED" },
      });

      await tx.adminInvitation.create({
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
    });

    // Best-effort: the invitation itself is already committed above either
    // way, so a flaky email provider never blocks creating it — the admin
    // can still share the accept link manually, same as before Resend.
    const inviter = existingAdmins.find((a) => a.email.toLowerCase() === admin.email.toLowerCase());
    const emailResult = await sendAdminInviteEmail({
      to: email,
      role: data.role,
      inviterName: inviter ? displayName(inviter) : admin.email,
      acceptUrl: `${await getBaseUrl()}/admin/accept-invitation`,
    });

    return ok({ emailSent: emailResult.ok });
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not send the invitation. Please check the email address."));
  }
}

/** Called only after the invitee has fully authenticated via Google —
 * never before. That ordering is the whole safety property: there is no
 * weaker "click the link" step that grants access by itself (see
 * docs/security-boundaries.md and the AdminInvitation model comment). */
export async function acceptInvitationAction(): Promise<ActionResult> {
  try {
    const identity = await getTrustedIdentity();
    if (!identity) {
      return fail("You must sign in with Google before accepting an invitation.");
    }
    const email = identity.email.trim().toLowerCase();

    await prisma.$transaction(async (tx) => {
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
    });

    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err));
  }
}

const roleSchema = z.enum(["ADMIN", "MODERATOR", "AUDITOR"]);

export async function updateAdminRoleAction(adminUserId: string, role: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_ADMIN_USERS");
    const newRole = roleSchema.parse(role);

    await prisma.$transaction(async (tx) => {
      if (newRole !== "ADMIN" && (await isLastActiveAdmin(tx, adminUserId))) {
        throw new Error("There must always be at least one active ADMIN.");
      }
      const target = await tx.adminUser.update({ where: { id: adminUserId }, data: { role: newRole } });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.adminUserId,
          action: "ADMIN_ROLE_CHANGED",
          metadata: { targetAdminUserId: target.id, role: newRole },
        },
      });
    });
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not change this member's role."));
  }
}

/** Soft — deactivating, not deleting, the AdminUser row: their history
 * (as an audit actor, as createdBy/updatedBy on events) must stay intact.
 * Their next requireAdmin() check fails immediately since it checks
 * `active`, regardless of any session they still hold. */
export async function deactivateAdminAction(adminUserId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_ADMIN_USERS");
    await prisma.$transaction(async (tx) => {
      if (await isLastActiveAdmin(tx, adminUserId)) {
        throw new Error("There must always be at least one active ADMIN.");
      }
      const target = await tx.adminUser.update({ where: { id: adminUserId }, data: { active: false } });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.adminUserId,
          action: "ADMIN_REMOVED",
          metadata: { targetAdminUserId: target.id },
        },
      });
    });
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not remove this member."));
  }
}

/** Extends the expiry on the existing pending row and, if Resend is
 * configured, actually re-sends the invite email — before Resend, this
 * only ever extended the expiry window (invitees got the accept link
 * shared manually), so a "resend" was a bit of a misnomer. */
export async function resendInvitationAction(invitationId: string): Promise<ActionResult<{ emailSent: boolean }>> {
  try {
    const admin = await requirePermission("MANAGE_ADMIN_USERS");
    const existingAdmins = await getAdminUsersWithEmail();

    const invitation = await prisma.$transaction(async (tx) => {
      const invitation = await tx.adminInvitation.findUniqueOrThrow({ where: { id: invitationId } });
      if (invitation.status !== "PENDING") {
        throw new Error("Only a pending invitation can be resent.");
      }
      await tx.adminInvitation.update({
        where: { id: invitationId },
        data: { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.adminUserId,
          action: "ADMIN_INVITATION_RESENT",
          metadata: { email: invitation.email },
        },
      });
      return invitation;
    });

    const inviter = existingAdmins.find((a) => a.email.toLowerCase() === admin.email.toLowerCase());
    const emailResult = await sendAdminInviteEmail({
      to: invitation.email,
      role: invitation.role,
      inviterName: inviter ? displayName(inviter) : admin.email,
      acceptUrl: `${await getBaseUrl()}/admin/accept-invitation`,
    });

    return ok({ emailSent: emailResult.ok });
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not resend the invitation."));
  }
}

export async function cancelInvitationAction(invitationId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_ADMIN_USERS");
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.adminInvitation.update({
        where: { id: invitationId },
        data: { status: "REVOKED" },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.adminUserId,
          action: "ADMIN_INVITATION_CANCELLED",
          metadata: { email: invitation.email },
        },
      });
    });
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not cancel the invitation."));
  }
}
