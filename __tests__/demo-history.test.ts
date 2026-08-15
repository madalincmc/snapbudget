import { describe, expect, it } from 'vitest';
import { monthKeyOf } from '@/lib/dashboard/aggregate';
import { DEMO_ANA, DEMO_BOGDAN, DEMO_ME, demoReceipts } from '@/lib/demo/fixtures';
import { DEMO_PAGE_SIZE, demoHistoryPage } from '@/lib/demo/history';

const now = new Date(2026, 7, 15);
const rows = demoReceipts(now);

describe('demoHistoryPage', () => {
  it('returns a first page and says there is more behind it', () => {
    const page = demoHistoryPage(rows, {});

    expect(page.receipts).toHaveLength(DEMO_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    expect(rows.length).toBeGreaterThan(DEMO_PAGE_SIZE);
  });

  it('pages without repeating or skipping a row', () => {
    const seen = new Set<string>();
    let offset = 0;

    for (;;) {
      const page = demoHistoryPage(rows, { offset });
      for (const r of page.receipts) seen.add(r.id);
      if (!page.hasMore) break;
      offset += DEMO_PAGE_SIZE;
    }

    expect(seen.size).toBe(rows.length);
  });

  it('sorts by date, newest first, by default', () => {
    const dates = demoHistoryPage(rows, {}).receipts.map((r) => r.purchase_date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('sorts by amount in both directions', () => {
    const desc = demoHistoryPage(rows, { sort: 'amount_desc' }).receipts.map((r) => r.amount!);
    const asc = demoHistoryPage(rows, { sort: 'amount_asc' }).receipts.map((r) => r.amount!);

    expect(desc[0]).toBeGreaterThan(desc[desc.length - 1]);
    expect(asc[0]).toBeLessThan(asc[asc.length - 1]);
    expect(desc[0]).toBe(Math.max(...rows.map((r) => r.amount ?? 0)));
  });

  it('puts the dateless row last when sorting by date, in both directions', () => {
    for (const sort of ['date_desc', 'date_asc']) {
      const all: (string | null)[] = [];
      for (let offset = 0; offset < rows.length; offset += DEMO_PAGE_SIZE) {
        all.push(...demoHistoryPage(rows, { sort, offset }).receipts.map((r) => r.purchase_date));
      }
      expect(all[all.length - 1], sort).toBeNull();
    }
  });

  it('searches the merchant, case-insensitively', () => {
    const page = demoHistoryPage(rows, { q: 'kaufl' });

    expect(page.receipts.length).toBeGreaterThan(0);
    expect(page.receipts.every((r) => r.merchant === 'Kaufland')).toBe(true);
  });

  it('filters by category, and ignores one that is not real', () => {
    const filtered = demoHistoryPage(rows, { category: 'Transport' });
    expect(filtered.receipts.every((r) => r.category === 'Transport')).toBe(true);

    const nonsense = demoHistoryPage(rows, { category: 'Criptomonede' });
    expect(nonsense.receipts).toHaveLength(DEMO_PAGE_SIZE);
  });

  it('filters by month on purchase_date only, the way the real endpoint does', () => {
    const month = monthKeyOf(now);
    const page = demoHistoryPage(rows, { month });

    expect(page.receipts.length).toBeGreaterThan(0);
    expect(page.receipts.every((r) => r.purchase_date?.startsWith(month))).toBe(true);
    // The row with no date is excluded — a NULL comparison is false in Postgres
    // too, and the two screens have to agree.
    expect(page.receipts.some((r) => r.purchase_date === null)).toBe(false);
  });

  it('narrows to one member, with "me" meaning the demo account', () => {
    const mine = demoHistoryPage(rows, { who: 'me' });
    expect(mine.receipts.every((r) => r.user_id === DEMO_ME)).toBe(true);

    const his = demoHistoryPage(rows, { who: DEMO_BOGDAN });
    expect(his.receipts.every((r) => r.user_id === DEMO_BOGDAN)).toBe(true);
    expect(his.receipts.length).toBeGreaterThan(0);
  });

  it('combines filters rather than letting the last one win', () => {
    const page = demoHistoryPage(rows, {
      who: DEMO_ANA,
      category: 'Mâncare & Băutură',
      sort: 'amount_desc',
    });

    expect(page.receipts.length).toBeGreaterThan(0);
    for (const r of page.receipts) {
      expect(r.user_id).toBe(DEMO_ANA);
      expect(r.category).toBe('Mâncare & Băutură');
    }
  });

  it("leaves the caller's rows in the order it was given them", () => {
    const before = rows.map((r) => r.id);
    demoHistoryPage(rows, { sort: 'amount_asc' });
    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it('returns an empty page rather than throwing on a search that matches nothing', () => {
    const page = demoHistoryPage(rows, { q: 'nu exista magazinul acesta' });

    expect(page.receipts).toEqual([]);
    expect(page.hasMore).toBe(false);
  });
});
