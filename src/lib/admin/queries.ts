import "server-only";

import { prisma } from "@/lib/prisma/client";
import type { AdminRole } from "@prisma/client";

export type AdminIdentity = {
  email: string;
  /** From Google's `full_name` claim (raw_user_meta_data) — null for an
   * account that somehow never carried one, which display name falls
   * back on the email for. */
  fullName: string | null;
  /** Google's profile photo, from raw_user_meta_data — purely cosmetic,
   * never used for any authorization decision. */
  avatarUrl: string | null;
};

export type AdminUserRow = AdminIdentity & {
  id: string;
  role: AdminRole;
  active: boolean;
};

/** The name people actually recognize, not the account identifier —
 * every UI that shows "who did this" should render this, not `.email`. */
export function displayName(identity: AdminIdentity): string {
  return identity.fullName || identity.email;
}

/** Joins to auth.users for a usable admin list — raw auth_user_id UUIDs
 * aren't something anyone should have to read to manage the team. */
export async function getAdminUsersWithEmail(): Promise<AdminUserRow[]> {
  return prisma.$queryRaw<AdminUserRow[]>`
    select au.id as "id", u.email as "email", u.raw_user_meta_data->>'full_name' as "fullName",
      u.raw_user_meta_data->>'avatar_url' as "avatarUrl", au.role as "role", au.active as "active"
    from admin_users au
    join auth.users u on u.id = au.auth_user_id
    order by au.created_at asc
  `;
}

/** Looks up display identities for a set of admin_users.id values (e.g.
 * an event's createdById/updatedById) in one query, for EntityMetadata. */
export async function getAdminIdentitiesByIds(adminUserIds: string[]): Promise<Map<string, AdminIdentity>> {
  if (adminUserIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<
    { id: string; email: string; fullName: string | null; avatarUrl: string | null }[]
  >`
    select au.id as "id", u.email as "email", u.raw_user_meta_data->>'full_name' as "fullName",
      u.raw_user_meta_data->>'avatar_url' as "avatarUrl"
    from admin_users au
    join auth.users u on u.id = au.auth_user_id
    where au.id = any(${adminUserIds}::uuid[])
  `;
  return new Map(
    rows.map((row) => [row.id, { email: row.email, fullName: row.fullName, avatarUrl: row.avatarUrl }])
  );
}
