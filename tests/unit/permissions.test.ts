import { describe, it, expect } from "vitest";
import { roleCan } from "@/lib/auth/permissions";

describe("roleCan() — approved RBAC matrix", () => {
  it("ADMIN has full authority, including finalize and admin management", () => {
    expect(roleCan("ADMIN", "FINALIZE_RESULTS")).toBe(true);
    expect(roleCan("ADMIN", "MANAGE_ADMIN_USERS")).toBe(true);
    expect(roleCan("ADMIN", "OPEN_VOTING")).toBe(true);
    expect(roleCan("ADMIN", "REOPEN_VOTING")).toBe(true);
    expect(roleCan("ADMIN", "VIEW_LIVE_RESULTS")).toBe(true);
  });

  it("MODERATOR can pause/resume but nothing else sensitive", () => {
    expect(roleCan("MODERATOR", "PAUSE_VOTING")).toBe(true);
    expect(roleCan("MODERATOR", "RESUME_VOTING")).toBe(true);

    expect(roleCan("MODERATOR", "OPEN_VOTING")).toBe(false);
    expect(roleCan("MODERATOR", "CLOSE_VOTING")).toBe(false);
    expect(roleCan("MODERATOR", "REOPEN_VOTING")).toBe(false);
    expect(roleCan("MODERATOR", "FINALIZE_RESULTS")).toBe(false);
    expect(roleCan("MODERATOR", "MANAGE_ADMIN_USERS")).toBe(false);
    expect(roleCan("MODERATOR", "MANAGE_CANDIDATES_FULL")).toBe(false);
  });

  it("MODERATOR never sees live per-candidate results while voting is open/paused", () => {
    expect(roleCan("MODERATOR", "VIEW_LIVE_RESULTS")).toBe(false);
  });

  it("MODERATOR can see final results once voting has ended", () => {
    expect(roleCan("MODERATOR", "VIEW_FINAL_RESULTS")).toBe(true);
  });

  it("AUDITOR is read-only: no mutation permission of any kind", () => {
    const mutationPermissions = [
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
    ] as const;
    for (const permission of mutationPermissions) {
      expect(roleCan("AUDITOR", permission)).toBe(false);
    }
  });

  it("AUDITOR never sees live per-candidate results while voting is open/paused", () => {
    expect(roleCan("AUDITOR", "VIEW_LIVE_RESULTS")).toBe(false);
  });

  it("AUDITOR can view final results, audit log, and export", () => {
    expect(roleCan("AUDITOR", "VIEW_FINAL_RESULTS")).toBe(true);
    expect(roleCan("AUDITOR", "VIEW_AUDIT_LOG")).toBe(true);
    expect(roleCan("AUDITOR", "EXPORT_RESULTS")).toBe(true);
  });

  it("only ADMIN can manage other admin accounts", () => {
    expect(roleCan("ADMIN", "MANAGE_ADMIN_USERS")).toBe(true);
    expect(roleCan("MODERATOR", "MANAGE_ADMIN_USERS")).toBe(false);
    expect(roleCan("AUDITOR", "MANAGE_ADMIN_USERS")).toBe(false);
  });
});
