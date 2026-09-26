import type { AdminRole } from "@prisma/client";

/** The approved permission matrix, as data — not scattered `role === "ADMIN"`
 * checks. Adding a permission means adding one line here, not hunting
 * through actions for the right role list. */
export const PERMISSIONS = [
  "MANAGE_EVENT_CONFIG", // create/edit event, schedule, eligibility mode
  "OPEN_VOTING", // SCHEDULED -> OPEN
  "PAUSE_VOTING", // OPEN -> PAUSED
  "RESUME_VOTING", // PAUSED -> OPEN
  "CLOSE_VOTING", // OPEN/PAUSED -> CLOSED
  "REOPEN_VOTING", // CLOSED -> OPEN (exceptional) — ADMIN only, deliberately not delegated
  "FINALIZE_RESULTS", // CLOSED -> FINALIZED (irreversible) — ADMIN only, deliberately not delegated
  "MANAGE_CANDIDATES_FULL", // create/delete candidates & categories, change candidate number
  "MANAGE_CANDIDATES_LIMITED", // edit photo/tagline/display order only, pre-OPEN
  "MANAGE_ACCESS_CODES", // Mode B generation/revocation/export (dormant for now)
  "MANAGE_ADMIN_USERS", // invite/deactivate/change role — see canManageRole()/canInviteRole() below for *which* roles this actually reaches
  "VIEW_OPERATIONAL_DASHBOARD", // ballot count, event state — everyone with any admin role
  "VIEW_LIVE_RESULTS", // per-candidate tallies while OPEN/PAUSED
  "VIEW_FINAL_RESULTS", // per-candidate tallies after CLOSED/FINALIZED
  "EXPORT_RESULTS",
  "VIEW_AUDIT_LOG",
  "VIEW_VOTER_LIST", // names/emails of who has voted — more sensitive than the aggregate count everyone sees
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  ADMIN: [
    "MANAGE_EVENT_CONFIG",
    "OPEN_VOTING",
    "PAUSE_VOTING",
    "RESUME_VOTING",
    "CLOSE_VOTING",
    "REOPEN_VOTING",
    "FINALIZE_RESULTS",
    "MANAGE_CANDIDATES_FULL",
    "MANAGE_CANDIDATES_LIMITED",
    "MANAGE_ACCESS_CODES",
    "MANAGE_ADMIN_USERS",
    "VIEW_OPERATIONAL_DASHBOARD",
    "VIEW_LIVE_RESULTS",
    "VIEW_FINAL_RESULTS",
    "EXPORT_RESULTS",
    "VIEW_AUDIT_LOG",
    "VIEW_VOTER_LIST",
  ],
  // Everything ADMIN can do operationally, except the two actions that are
  // irreversible or exceptional (REOPEN_VOTING, FINALIZE_RESULTS) — those
  // stay ADMIN-only regardless of the role-hierarchy change below.
  // MANAGE_ADMIN_USERS is granted, but canManageRole()/canInviteRole() cap
  // what a MODERATOR can actually do with it to AUDITOR-level accounts.
  MODERATOR: [
    "MANAGE_EVENT_CONFIG",
    "OPEN_VOTING",
    "PAUSE_VOTING",
    "RESUME_VOTING",
    "CLOSE_VOTING",
    "MANAGE_CANDIDATES_FULL",
    "MANAGE_CANDIDATES_LIMITED",
    "MANAGE_ADMIN_USERS",
    "VIEW_OPERATIONAL_DASHBOARD",
    "VIEW_LIVE_RESULTS",
    "VIEW_FINAL_RESULTS",
    "EXPORT_RESULTS",
    "VIEW_AUDIT_LOG",
    "VIEW_VOTER_LIST",
  ],
  AUDITOR: ["VIEW_OPERATIONAL_DASHBOARD", "VIEW_FINAL_RESULTS", "EXPORT_RESULTS", "VIEW_AUDIT_LOG"],
};

export function roleCan(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** ADMIN > MODERATOR > AUDITOR. Purely for the admin-user-management
 * hierarchy below — has no bearing on any other permission. */
const ROLE_LEVEL: Record<AdminRole, number> = { ADMIN: 3, MODERATOR: 2, AUDITOR: 1 };

/** Whether `actorRole` may change the role of, or deactivate, an existing
 * account currently at `targetRole` — strictly below the actor's own
 * level, never equal or above. This is what makes two ADMINs (or two
 * MODERATORs) unable to touch each other: an ADMIN can manage a MODERATOR
 * or AUDITOR, but never another ADMIN; a MODERATOR can manage an AUDITOR,
 * but never another MODERATOR or an ADMIN. There is deliberately no way
 * to reach an ADMIN-role target through this check at all — an existing
 * ADMIN's role/active status can only ever be changed via direct database
 * access, the same deliberate friction this project already applies to
 * bootstrapping the first ADMIN and to "un-finalizing" results. */
export function canManageRole(actorRole: AdminRole, targetRole: AdminRole): boolean {
  return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}

/** Whether `actorRole` may invite a *new* account at `roleToInvite`. Same
 * strictly-below rule as canManageRole(), with one deliberate exception:
 * an ADMIN may invite a brand-new peer ADMIN (onboarding a co-equal admin,
 * e.g. from a partner organization, has to be possible somehow) — but
 * once that account exists, canManageRole() above means neither of them
 * can ever change the other's role or deactivate them through the app.
 * The exception only ever applies to creating a new account, never to
 * modifying an existing one. */
export function canInviteRole(actorRole: AdminRole, roleToInvite: AdminRole): boolean {
  if (actorRole === "ADMIN" && roleToInvite === "ADMIN") return true;
  return canManageRole(actorRole, roleToInvite);
}
