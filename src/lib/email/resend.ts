import "server-only";

import { Resend } from "resend";

/** Used only for admin invitation emails — nothing voter-facing sends
 * email at all. Optional by design: if RESEND_API_KEY isn't set, invites
 * still work exactly as before (the admin shares the accept-invitation
 * link manually), just without an email going out. */
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// resend.dev's shared sending address — works out of the box with no
// domain verification, but Resend brands the email as coming through it.
// Once a real domain is verified in the Resend dashboard, replace this
// with an address on that domain (e.g. "invites@cafton.com") via the
// RESEND_FROM_EMAIL env var.
export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Cafton Voting <onboarding@resend.dev>";

export async function sendAdminInviteEmail({
  to,
  role,
  inviterName,
  acceptUrl,
}: {
  to: string;
  role: string;
  inviterName: string;
  acceptUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: "Email is not configured on this server." };

  const { error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject: "You've been invited to the Mr. & Ms. SIT admin team",
    html: `
      <p>${inviterName} invited you to join the Mr. &amp; Ms. SIT admin team as <strong>${role}</strong>.</p>
      <p><a href="${acceptUrl}">Accept the invitation</a> — sign in with the Google account this was sent to.</p>
      <p style="color:#666;font-size:12px">This invitation expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
    `,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
