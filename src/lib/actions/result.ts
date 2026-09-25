import { ZodError } from "zod";

/** Server Actions model expected errors as return values, not thrown
 * exceptions — this is Next's own current guidance (see
 * node_modules/next/dist/docs/.../error-handling.md: "avoid using
 * try/catch blocks and throw errors [for expected errors]. Instead,
 * model expected errors as return values"). A raw thrown Error also risks
 * ending up as an unhandled digest-redacted message in some paths; a
 * plain return value never has that ambiguity, and it lets every calling
 * form keep the user's input on screen instead of unmounting into an
 * error boundary. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(message: string): ActionResult<never> {
  return { ok: false, message };
}

/** Converts a caught error into a message safe to show a voter/admin —
 * never a raw Prisma/Postgres error string, which can leak schema
 * details and reads as broken rather than as a real validation message. */
export function toFriendlyMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ZodError) {
    return err.issues[0]?.message ?? fallback;
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") return "That value is already in use.";
    if (code === "P2025") return "That record could not be found — it may have been removed.";
  }
  if (err instanceof Error) {
    // Errors we raise ourselves (business-rule messages) are already
    // written to be shown to the user; anything else falls back rather
    // than risk leaking an internal message.
    return err.message.length < 200 ? err.message : fallback;
  }
  return fallback;
}
