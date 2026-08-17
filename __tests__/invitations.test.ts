import { describe, expect, it } from 'vitest';
import {
  INVITATION_TTL_DAYS,
  canonicalEmail,
  daysLeft,
  invitationEmail,
  invitationExpiry,
  invitationUrl,
  isExpired,
} from '@/lib/household/invitations';

describe('canonicalEmail', () => {
  it('treats every spelling of one Gmail mailbox as the same address', () => {
    const forms = [
      'madalincotetiu@gmail.com',
      'madalin.cotetiu@gmail.com',
      'm.a.d.a.l.i.n.c.o.t.e.t.i.u@gmail.com',
      'madalincotetiu+snapbudget@gmail.com',
      'madalin.cotetiu+test@gmail.com',
      'MADALIN.COTETIU@Gmail.com',
      '  madalincotetiu@gmail.com  ',
    ];

    for (const form of forms) {
      expect(canonicalEmail(form), form).toBe('madalincotetiu@gmail.com');
    }
  });

  it('folds googlemail onto gmail — same mailbox, older name', () => {
    expect(canonicalEmail('ana.pop@googlemail.com')).toBe('anapop@gmail.com');
  });

  it('leaves other providers alone, dots included', () => {
    // A dot is a significant character everywhere else. Stripping it here
    // would quietly point an invitation at a different person.
    expect(canonicalEmail('ana.pop@yahoo.com')).toBe('ana.pop@yahoo.com');
    expect(canonicalEmail('Ana.Pop@Outlook.com')).toBe('ana.pop@outlook.com');
    expect(canonicalEmail('ana+tag@fastmail.com')).toBe('ana+tag@fastmail.com');
  });

  it('keeps two genuinely different Gmail users apart', () => {
    expect(canonicalEmail('anapop@gmail.com')).not.toBe(canonicalEmail('ana.popescu@gmail.com'));
  });

  it('is idempotent, so a stored value can be re-canonicalised safely', () => {
    const once = canonicalEmail('madalin.cotetiu+x@gmail.com');
    expect(canonicalEmail(once)).toBe(once);
  });

  it('does not fall over on something that is not an address', () => {
    expect(canonicalEmail('nu-e-email')).toBe('nu-e-email');
    expect(canonicalEmail('')).toBe('');
  });

  it('splits on the last @, so a local part containing one is handled', () => {
    expect(canonicalEmail('"a@b".c@gmail.com')).toBe('"a@b"c@gmail.com');
  });
});

const now = new Date('2026-08-17T09:00:00.000Z');
const iso = (d: Date) => d.toISOString();
const inDays = (n: number) => iso(new Date(now.getTime() + n * 86_400_000));

describe('invitationExpiry', () => {
  it('is a week out from when it was made', () => {
    expect(invitationExpiry(now).toISOString()).toBe(inDays(INVITATION_TTL_DAYS));
  });
});

describe('isExpired', () => {
  it('is false while there is time left', () => {
    expect(isExpired(inDays(1), now)).toBe(false);
  });

  it('is true once the moment has passed, and on the moment itself', () => {
    expect(isExpired(inDays(-1), now)).toBe(true);
    expect(isExpired(iso(now), now)).toBe(true);
  });

  it('treats a missing or unreadable value as expired', () => {
    // "I don't know when this stops working" must not mean "it never does" —
    // this is the check standing between a leaked link and a household.
    expect(isExpired(null, now)).toBe(true);
    expect(isExpired(undefined, now)).toBe(true);
    expect(isExpired('nu e o dată', now)).toBe(true);
  });
});

describe('daysLeft', () => {
  it('rounds up, so a part-day still reads as a day', () => {
    expect(daysLeft(inDays(6.2), now)).toBe(7);
    expect(daysLeft(inDays(0.1), now)).toBe(1);
  });

  it('floors at zero rather than going negative', () => {
    expect(daysLeft(inDays(-3), now)).toBe(0);
    expect(daysLeft(null, now)).toBe(0);
  });
});

describe('invitationUrl', () => {
  it('points at the invite route on the given site', () => {
    expect(invitationUrl('https://snapbudget.space', 'abc-123')).toBe(
      'https://snapbudget.space/invite/abc-123',
    );
  });

  it('does not double the slash when the site url carries one', () => {
    expect(invitationUrl('https://snapbudget.space/', 'abc')).toBe(
      'https://snapbudget.space/invite/abc',
    );
  });
});

describe('invitationEmail', () => {
  const base = {
    inviterName: 'Madalin',
    householdName: 'Familia Popescu',
    url: 'https://snapbudget.space/invite/abc-123',
    expiresAt: inDays(7),
    now,
  };

  it('names the inviter and the household in the subject', () => {
    expect(invitationEmail(base).subject).toBe('Madalin te invită în gospodăria „Familia Popescu”');
  });

  it('carries the link in both the html and the plain text part', () => {
    const { html, text } = invitationEmail(base);
    expect(html).toContain('https://snapbudget.space/invite/abc-123');
    expect(text).toContain('https://snapbudget.space/invite/abc-123');
  });

  it('states how long it stays valid', () => {
    expect(invitationEmail(base).text).toContain('încă 7 zile');
    expect(invitationEmail({ ...base, expiresAt: inDays(1) }).text).toContain('încă o zi');
  });

  it('escapes a name that would otherwise close a tag', () => {
    const { html } = invitationEmail({
      ...base,
      inviterName: '<script>alert(1)</script>',
      householdName: 'Casa "mea" & a ta',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('escapes a url so it cannot break out of the href', () => {
    const { html } = invitationEmail({
      ...base,
      url: 'https://snapbudget.space/invite/x" onclick="steal()',
    });

    expect(html).not.toContain('onclick="steal()"');
    expect(html).toContain('&quot;');
  });

  it('does not put the inviter in the From — that is what Reply-To is for', () => {
    // Sending as a gmail.com address through our own relay fails SPF and DKIM
    // alignment, so the whole message is junked. The template must not imply it.
    const { html } = invitationEmail(base);
    expect(html).not.toContain('@gmail.com');
  });
});
