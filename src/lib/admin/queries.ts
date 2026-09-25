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
