/**
 * The one place that talks to a mail relay.
 *
 * Plain REST rather than the provider's SDK, matching how the Vision API is
 * called: one endpoint, one shape, nothing pulled into the bundle. Swapping
 * relays means rewriting this file and nothing else — every caller sees only
 * `sendEmail`.
 */

const ENDPOINT = 'https://api.resend.com/emails';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Where a reply goes. The invitation names the inviter but cannot be sent
   * *from* them — mail claiming a gmail.com sender through our relay fails SPF
   * and DKIM alignment, so DMARC rejects it. This is what makes "reply to the
   * person who invited me" work anyway.
   */
  replyTo?: string;
}

export type SendResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'rejected' | 'unreachable'; detail?: string };

/**
 * Sends, or says why it could not.
 *
 * Never throws. Callers here have already written a row the reader can see —
 * an invitation exists whether or not the email about it went out — and
 * turning a mail outage into a failed invitation would be the wrong trade. The
 * result is reported instead, so the screen can offer to send it again.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  // Not an error: local development and preview builds run without a relay,
  // and the flow around this has to stay usable there.
  if (!apiKey || !from) {
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: [message.replyTo] } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { sent: false, reason: 'rejected', detail: detail.slice(0, 300) };
    }

    return { sent: true };
  } catch (err) {
    return { sent: false, reason: 'unreachable', detail: (err as Error).message };
  }
}

/** Whether a relay is wired up at all — lets a screen say so before trying. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
