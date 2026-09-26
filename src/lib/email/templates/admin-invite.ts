// Table-based layout with every style inline — the only layout approach
// that renders consistently across Outlook/Gmail/Apple Mail, none of
// which reliably support modern CSS (flexbox, grid, external stylesheets).
// No external image (the Cafton mark is normally an inline SVG component,
// which most mail clients strip or block) — the wordmark badge below is
// built from plain HTML/CSS instead, so it always renders.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Full control — manage events, candidates, results, and the rest of the team.",
  MODERATOR: "Manage voting and candidates, and view live results and the audit log.",
  AUDITOR: "Read-only — view results, export data, and review the audit log.",
};

export function renderAdminInviteEmail({
  inviterName,
  role,
  acceptUrl,
}: {
  inviterName: string;
  role: string;
  acceptUrl: string;
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(inviterName);
  const safeRole = escapeHtml(role);
  const roleDescription = ROLE_DESCRIPTIONS[role] ?? "";

  const subject = "You've been invited to the Mr. & Ms. SIT admin team";

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:32px 32px 0 32px; text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="width:44px; height:44px; background-color:#18181b; border-radius:12px; text-align:center; vertical-align:middle;">
                      <span style="color:#ffffff; font-size:18px; font-weight:700; line-height:44px;">C</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 4px 0; font-size:12px; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:#71717a;">
                  Cafton
                </p>
                <h1 style="margin:0 0 8px 0; font-size:20px; font-weight:600; color:#18181b;">
                  You've been invited
                </h1>
                <p style="margin:0; font-size:14px; color:#52525b; line-height:1.5;">
                  ${safeName} invited you to join the Mr. &amp; Ms. SIT admin team.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 4px 0; font-size:11px; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:#71717a;">
                        Role
                      </p>
                      <p style="margin:0 0 4px 0; font-size:15px; font-weight:600; color:#18181b;">${safeRole}</p>
                      <p style="margin:0; font-size:13px; color:#52525b; line-height:1.4;">${roleDescription}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px; text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="border-radius:10px; background-color:#18181b;">
                      <a href="${acceptUrl}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                        Accept invitation
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0; font-size:12px; color:#a1a1aa; line-height:1.5;">
                  Sign in with the Google account this invitation was sent to. This link expires in 7 days.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; border-top:1px solid #e4e4e7; text-align:center;">
                <p style="margin:0; font-size:11px; color:#a1a1aa; line-height:1.5;">
                  If you weren't expecting this invitation, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0; font-size:11px; color:#a1a1aa;">
            Voting Technology Partner — CAFTON · University of Baguio · School of Information Technology
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  const text = [
    `${inviterName} invited you to join the Mr. & Ms. SIT admin team as ${role}.`,
    roleDescription,
    "",
    `Accept the invitation: ${acceptUrl}`,
    "",
    "Sign in with the Google account this invitation was sent to. This link expires in 7 days.",
    "If you weren't expecting this invitation, you can safely ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
