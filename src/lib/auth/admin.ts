import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { getTrustedIdentity } from "./identity";
import { roleCan, type Permission } from "./permissions";

/** Administrative authorization is completely separate from voter
 * eligibility — holding an @s.ubaguio.edu/@e.ubaguio.edu account never
 * implies an AdminUser row exists, and this never checks
 * ALLOWED_VOTER_DOMAINS. The first ADMIN is a manual database bootstrap
 * (see docs/database-setup.md); every account after that arrives via
 * AdminInvitation (src/actions/admin/invitations.ts). */
export async function requireUser() {
  const identity = await getTrustedIdentity();
  if (!identity) redirect("/admin/login");
  return identity;
}

/** Distinct from requireUser()'s redirect-to-login: an *authenticated*
 * account with no admin_users row (or a deactivated one) is never going
 * to succeed by trying to log in again — sending it back to /admin/login
 * is a dead-end loop. This is also a real security point, not just UX:
 * a UB student's own valid Google sign-in must never land them on an
 * admin login screen at all — /unauthorized explains why and links back
 * to the public site instead. */
export const requireAdmin = cache(async () => {
  const identity = await requireUser();
  const adminUser = await prisma.adminUser.findUnique({
    where: { authUserId: identity.authUserId },
  });
  if (!adminUser || !adminUser.active) redirect("/unauthorized");
  return { ...identity, adminUserId: adminUser.id, role: adminUser.role };
});

export async function requireRole(role: AdminRole) {
  const admin = await requireAdmin();
  if (admin.role !== role) {
    throw new Error("You don't have permission to do that.");
  }
  return admin;
}

/** Used where more than one role shares a permission — e.g. pause/resume
 * is ADMIN and MODERATOR, but not AUDITOR. */
export async function requireAnyRole(roles: AdminRole[]) {
  const admin = await requireAdmin();
  if (!roles.includes(admin.role)) {
    throw new Error("You don't have permission to do that.");
  }
  return admin;
}

/** Preferred over requireRole/requireAnyRole for anything covered by the
 * permission matrix (src/lib/auth/permissions.ts) — encodes "what can
 * this role do" as data in one place instead of a role list at every call
 * site. */
export async function requirePermission(permission: Permission) {
  const admin = await requireAdmin();
  if (!roleCan(admin.role, permission)) {
    throw new Error("You don't have permission to do that.");
  }
  return admin;
}
