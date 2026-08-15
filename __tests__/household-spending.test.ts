import { describe, expect, it } from 'vitest';
import type { ReceiptRow } from '@/lib/dashboard/aggregate';
import type { HouseholdMemberInfo } from '@/lib/household/membership';
import { buildHouseholdSpending } from '@/lib/household/spending';

/** Minimal processed expense; only the fields the aggregation reads. */
function expense(partial: Partial<ReceiptRow> & { amount: number }): ReceiptRow {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'ana',
    merchant: 'Test',
    purchase_date: '2026-08-10',
    category: 'Transport',
    subcategory: null,
    status: 'processed',
    source: 'manual',
    created_at: '2026-08-10T09:00:00.000Z',
    ...partial,
  };
}

const members: HouseholdMemberInfo[] = [
  { userId: 'ana', displayName: 'Ana', avatarUrl: null },
  { userId: 'bogdan', displayName: 'Bogdan', avatarUrl: null },
];

describe('buildHouseholdSpending', () => {
  it('totals per member, biggest spender first', () => {
    const spending = buildHouseholdSpending(
      [
        expense({ user_id: 'ana', amount: 100 }),
        expense({ user_id: 'ana', amount: 50 }),
        expense({ user_id: 'bogdan', amount: 300 }),
      ],
      members,
      '2026-08',
    );

    expect(spending.total).toBe(450);
    expect(spending.max).toBe(300);
    expect(spending.members.map((m) => [m.userId, m.total, m.count])).toEqual([
      ['bogdan', 300, 1],
      ['ana', 150, 2],
    ]);
  });

  it('gives each member a share of the household total', () => {
    const spending = buildHouseholdSpending(
      [expense({ user_id: 'ana', amount: 75 }), expense({ user_id: 'bogdan', amount: 25 })],
      members,
      '2026-08',
    );

    expect(spending.members.map((m) => m.share)).toEqual([75, 25]);
  });

  it('keeps members who spent nothing, in join order', () => {
    const spending = buildHouseholdSpending(
      [expense({ user_id: 'bogdan', amount: 40 })],
      [...members, { userId: 'carmen', displayName: 'Carmen', avatarUrl: null }],
      '2026-08',
    );

    expect(spending.members.map((m) => [m.userId, m.total])).toEqual([
      ['bogdan', 40],
      ['ana', 0],
      ['carmen', 0],
    ]);
    expect(spending.members[1].share).toBe(0);
  });

  it('counts only the selected month, using created_at when a date is missing', () => {
    const spending = buildHouseholdSpending(
      [
        expense({ user_id: 'ana', amount: 100, purchase_date: '2026-07-31' }),
        expense({ user_id: 'ana', amount: 10, purchase_date: '2026-08-01' }),
        expense({
          user_id: 'bogdan',
          amount: 20,
          purchase_date: null,
          created_at: '2026-08-15T09:00:00.000Z',
        }),
        expense({
          user_id: 'bogdan',
          amount: 999,
          purchase_date: null,
          created_at: '2026-09-01T09:00:00.000Z',
        }),
      ],
      members,
      '2026-08',
    );

    expect(spending.total).toBe(30);
  });

  it('ignores rows that are not spent money', () => {
    const spending = buildHouseholdSpending(
      [
        expense({ user_id: 'ana', amount: 100, status: 'pending' }),
        expense({ user_id: 'ana', amount: null as unknown as number }),
        expense({ user_id: 'bogdan', amount: 60 }),
      ],
      members,
      '2026-08',
    );

    expect(spending.total).toBe(60);
    expect(spending.members.find((m) => m.userId === 'ana')?.count).toBe(0);
  });

  it('rolls expenses from people who left into one row, so the parts still add up', () => {
    const spending = buildHouseholdSpending(
      [
        expense({ user_id: 'ana', amount: 100 }),
        expense({ user_id: 'dan-who-left', amount: 30 }),
        expense({ user_id: 'eva-who-left', amount: 20 }),
      ],
      members,
      '2026-08',
    );

    const departed = spending.members.find((m) => m.userId === null);
    expect(departed).toMatchObject({ total: 50, count: 2 });
    expect(spending.total).toBe(150);
    expect(spending.members.reduce((sum, m) => sum + m.total, 0)).toBe(spending.total);
  });

  it('has no members row and no shares when the month is empty', () => {
    const spending = buildHouseholdSpending([], members, '2026-08');

    expect(spending.total).toBe(0);
    expect(spending.max).toBe(0);
    expect(spending.members.every((m) => m.share === 0)).toBe(true);
  });

  it('survives a household with no roster rows yet', () => {
    const spending = buildHouseholdSpending([expense({ amount: 10 })], [], '2026-08');

    expect(spending.total).toBe(10);
    expect(spending.members).toHaveLength(1);
    expect(spending.members[0].userId).toBeNull();
  });
});
