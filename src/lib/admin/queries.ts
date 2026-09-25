import "server-only";

import { prisma } from "@/lib/prisma/client";
import type { AdminRole } from "@prisma/client";

export type AdminUserRow = {
  id: string;
  email: string;
  role: AdminRole;
  active: boolean;
};

/** Joins to auth.users for a usable admin list — raw auth_user_id UUIDs
 * aren't something anyone should have to read to manage the team. */
export async function getAdminUsersWithEmail(): Promise<AdminUserRow[]> {
  return prisma.$queryRaw<AdminUserRow[]>`
    select au.id as "id", u.email as "email", au.role as "role", au.active as "active"
    from admin_users au
    join auth.users u on u.id = au.auth_user_id
    order by au.created_at asc
  `;
}

/** Looks up display emails for a set of admin_users.id values (e.g. an
 * event's createdById/updatedById) in one query, for EntityMetadata. */
export async function getAdminEmailsByIds(adminUserIds: string[]): Promise<Map<string, string>> {
  if (adminUserIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ id: string; email: string }[]>`
    select au.id as "id", u.email as "email"
    from admin_users au
    join auth.users u on u.id = au.auth_user_id
    where au.id = any(${adminUserIds}::uuid[])
  `;
  return new Map(rows.map((row) => [row.id, row.email]));
}
