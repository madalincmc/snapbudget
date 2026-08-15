import { describe, expect, it } from 'vitest';
import { monthKeyOf, receiptMonth, shiftMonthKey } from '@/lib/dashboard/aggregate';
import { buildHouseholdSpending } from '@/lib/household/spending';
import { DEMO_ANA, DEMO_BOGDAN, DEMO_MEMBERS, demoReceipts } from '@/lib/demo/fixtures';

/**
 * The demo is dated relative to whenever it is opened, so these are the checks
 * that it still holds on the days that are easy to forget: the first of a
 * month, the end of a long one, and the end of February.
 */
const DAYS = [
  new Date(2026, 7, 1), // first of the month — almost everything is out of range
  new Date(2026, 7, 15),
  new Date(2026, 0, 31), // year boundary behind it
  new Date(2028, 1, 29), // leap February
];

describe('demo fixtures', () => {
  for (const now of DAYS) {
    const label = now.toDateString();

    it(`puts both members in the current month on ${label}`, () => {
      const spending = buildHouseholdSpending(demoReceipts(now), DEMO_MEMBERS, monthKeyOf(now));

      expect(spending.total).toBeGreaterThan(0);
      for (const userId of [DEMO_ANA, DEMO_BOGDAN]) {
        const member = spending.members.find((m) => m.userId === userId);
        expect(member?.total, `${userId} on ${label}`).toBeGreaterThan(0);
      }
    });

    it(`dates nothing into the future on ${label}`, () => {
      for (const r of demoReceipts(now)) {
        const day = (r.purchase_date ?? r.created_at).slice(0, 10);
        expect(day.localeCompare(toDay(now)), `${r.merchant} on ${label}`).toBeLessThanOrEqual(0);
      }
    });

    it(`fills the two months behind it on ${label}`, () => {
      const rows = demoReceipts(now);

      for (const back of [1, 2]) {
        const month = shiftMonthKey(monthKeyOf(now), -back);
        const spending = buildHouseholdSpending(rows, DEMO_MEMBERS, month);
        expect(spending.total, `${month}, seen from ${label}`).toBeGreaterThan(0);
        expect(spending.members.filter((m) => m.total > 0).length).toBe(2);
      }
    });

    it(`keeps every row inside the twelve months it claims on ${label}`, () => {
      const months = Array.from({ length: 12 }, (_, back) => shiftMonthKey(monthKeyOf(now), -back));

      for (const r of demoReceipts(now)) {
        expect(months, `${r.merchant} on ${label}`).toContain(receiptMonth(r));
      }
    });

    it(`leaves no month of the year empty on ${label}`, () => {
      const rows = demoReceipts(now);

      for (let back = 0; back < 12; back++) {
        const month = shiftMonthKey(monthKeyOf(now), -back);
        const spending = buildHouseholdSpending(rows, DEMO_MEMBERS, month);
        expect(spending.total, `${month}, seen from ${label}`).toBeGreaterThan(0);
      }
    });
  }

  it('leaves the pending scan out of the totals', () => {
    const now = new Date(2026, 7, 15);
    const rows = demoReceipts(now);
    const pending = rows.find((r) => r.status === 'pending');

    expect(pending, 'a pending row is part of the demo').toBeDefined();

    const spending = buildHouseholdSpending(rows, DEMO_MEMBERS, monthKeyOf(now));
    const withPending = buildHouseholdSpending(
      rows.map((r) => ({ ...r, status: 'processed' })),
      DEMO_MEMBERS,
      monthKeyOf(now),
    );

    expect(withPending.total - spending.total).toBe(pending!.amount);
  });

  it('carries a dateless entry, so the created_at fallback is exercised', () => {
    const rows = demoReceipts(new Date(2026, 7, 15));
    expect(rows.some((r) => r.purchase_date === null)).toBe(true);
  });
});

function toDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
