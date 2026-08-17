/**
 * What an invitation is worth, how long for, and what the email about it says.
 *
 * Kept away from the server actions so it can be read and tested without a
 * database or a mail relay behind it.
 */

/**
 * The mailbox an address actually reaches.
 *
 * Gmail ignores dots in the local part and everything from a "+" onwards, so
 * three spellings of one inbox have to match one invitation. Everywhere else a
 * dot is a significant character — stripping it would point an invitation at a
 * different person — so only Google is treated this way.
 *
 * Mirrors `public.canonical_email` in the canonical_invitation_email migration.
 * The two must agree: Postgres decides what RLS lets through, this decides what
 * the app looks up, and a difference between them is an invitation that is
 * visible but cannot be accepted.
 */
export function canonicalEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at < 0) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') return trimmed;

  return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`;
}

/** Matches the column default in the invitation_expiry migration. */
export const INVITATION_TTL_DAYS = 7;

/** When an invitation created now stops working. */
export function invitationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 86_400_000);
}

/**
 * Whether the link has gone stale.
 *
 * A missing value counts as expired rather than as forever: rows predating the
 * migration are backfilled, so a null here means something went wrong, and the
 * safe reading of "I don't know when this expires" is "it has".
 */
export function isExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return true;
  const at = new Date(expiresAt).getTime();
  return Number.isNaN(at) || at <= now.getTime();
}

/** How many whole days are left, floored at zero. */
export function daysLeft(expiresAt: string | null | undefined, now = new Date()): number {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/**
 * Where the invitation link points.
 *
 * Its own route rather than the dashboard: the recipient is not signed in yet,
 * and this is the one page that knows to send them through Google first and
 * bring them back to the same invitation afterwards.
 */
export function invitationUrl(siteUrl: string, invitationId: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/invite/${invitationId}`;
}

export interface InvitationEmailInput {
  inviterName: string;
  householdName: string;
  url: string;
  expiresAt: string;
  now?: Date;
}

export interface EmailBody {
  subject: string;
  html: string;
  text: string;
}

/**
 * The invitation email.
 *
 * Inline styles and a table for the button, because mail clients drop
 * stylesheets and Outlook ignores padding on anchors. Colours are sRGB
 * approximations of the app's own tokens — no client understands oklch.
 *
 * The inviter is named in the subject and the first line but is not the
 * sender: the message goes out from a domain we can authenticate, with the
 * inviter on Reply-To. Putting their address in From would fail SPF and land
 * the whole thing in spam.
 */
export function invitationEmail(input: InvitationEmailInput): EmailBody {
  const { inviterName, householdName, url, expiresAt, now = new Date() } = input;
  const days = daysLeft(expiresAt, now);
  const validity =
    days <= 0
      ? 'Invitația a expirat.'
      : days === 1
        ? 'Invitația este valabilă încă o zi.'
        : `Invitația este valabilă încă ${days} zile.`;

  const subject = `${inviterName} te invită în gospodăria „${householdName}”`;

  const text = [
    `${inviterName} te invită să vă vedeți cheltuielile împreună în gospodăria „${householdName}” pe SnapBudget.`,
    '',
    'Acceptă invitația:',
    url,
    '',
    validity,
    '',
    'Dacă nu știi despre ce e vorba, poți ignora acest mesaj — nu se întâmplă nimic.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="ro">
<body style="margin:0;padding:0;background:#f4f4f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f1;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td style="padding-bottom:20px;">
              <span style="font-size:15px;font-weight:700;color:#0e7a58;letter-spacing:-0.01em;">SnapBudget</span>
            </td>
          </tr>
          <tr>
            <td style="font-size:21px;line-height:1.3;font-weight:600;color:#161c20;padding-bottom:12px;">
              ${escapeHtml(inviterName)} te invită în gospodăria „${escapeHtml(householdName)}”
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.6;color:#4c5761;padding-bottom:24px;">
              Împreună vedeți aceleași totaluri: fiecare își fotografiază bonurile, iar cheltuielile
              gospodăriei se adună la un loc. Cheltuielile tale de dinainte rămân ale tale.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:22px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0e7a58;border-radius:999px;">
                    <a href="${escapeAttr(url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Acceptă invitația</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;line-height:1.6;color:#6b7680;border-top:1px solid #e6e6e1;padding-top:18px;">
              ${escapeHtml(validity)} Dacă nu știi despre ce e vorba, poți ignora acest mesaj — nu se
              întâmplă nimic.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Same, plus the single quote — an attribute may be delimited by either. */
function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
