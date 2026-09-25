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
  "REOPEN_VOTING", // CLOSED -> OPEN (exceptional)
  "FINALIZE_RESULTS", // CLOSED -> FINALIZED
  "MANAGE_CANDIDATES_FULL", // create/delete candidates & categories, change candidate number
  "MANAGE_CANDIDATES_LIMITED", // edit photo/tagline/display order only, pre-OPEN
  "MANAGE_ACCESS_CODES", // Mode B generation/revocation/export (dormant for now)
  "MANAGE_ADMIN_USERS", // invite/deactivate ADMIN/MODERATOR/AUDITOR
  "VIEW_OPERATIONAL_DASHBOARD", // ballot count, event state — everyone with any admin role
  "VIEW_LIVE_RESULTS", // per-candidate tallies while OPEN/PAUSED
  "VIEW_FINAL_RESULTS", // per-candidate tallies after CLOSED/FINALIZED
  "EXPORT_RESULTS",
  "VIEW_AUDIT_LOG",
  "VIEW_VOTER_LIST", // names/emails of who has voted — more sensitive than the aggregate count everyone sees; ADMIN only
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
  MODERATOR: [
    "PAUSE_VOTING",
    "RESUME_VOTING",
    "MANAGE_CANDIDATES_LIMITED",
    "VIEW_OPERATIONAL_DASHBOARD",
    "VIEW_FINAL_RESULTS",
  ],
  AUDITOR: ["VIEW_OPERATIONAL_DASHBOARD", "VIEW_FINAL_RESULTS", "EXPORT_RESULTS", "VIEW_AUDIT_LOG"],
};

export function roleCan(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
