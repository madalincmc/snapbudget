import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_TOKEN, categoryFromToken } from '@/lib/categories';
import { categoryPath, dashboardPath } from '@/lib/dashboard/links';

describe('categoryFromToken', () => {
  it('round-trips every category through its token', () => {
    for (const category of CATEGORIES) {
      expect(categoryFromToken(CATEGORY_TOKEN[category])).toBe(category);
    }
  });

  it('rejects tokens that name no category', () => {
    expect(categoryFromToken('groceries')).toBeNull();
    expect(categoryFromToken('')).toBeNull();
    expect(categoryFromToken(undefined)).toBeNull();
    expect(categoryFromToken('Food')).toBeNull();
  });

  it('rejects inherited object keys', () => {
    // The token comes off the URL. Backed by a plain object these would answer
    // with something truthy, and the caller would treat it as a category.
    expect(categoryFromToken('constructor')).toBeNull();
    expect(categoryFromToken('toString')).toBeNull();
    expect(categoryFromToken('__proto__')).toBeNull();
  });
});

describe('view paths', () => {
  it('addresses a category by token', () => {
    expect(categoryPath('Transport')).toBe('/categories/transport');
    expect(categoryPath('Mâncare & Băutură')).toBe('/categories/food');
  });

  it('carries only the params that are not the default', () => {
    expect(categoryPath('Transport', { month: '2026-07' })).toBe(
      '/categories/transport?month=2026-07',
    );
    expect(categoryPath('Transport', { who: 'me' })).toBe('/categories/transport?who=me');
    expect(categoryPath('Transport', { month: null, who: null })).toBe('/categories/transport');
    expect(dashboardPath({ month: '2026-07', who: 'me' })).toBe('/dashboard?month=2026-07&who=me');
    expect(dashboardPath()).toBe('/dashboard');
  });

  it('produces paths the receipt screen will return to', async () => {
    // The two are a pair: a path this builds has to survive returnPathFor, or
    // saving a receipt opened from a category screen would land on /dashboard.
    const { returnPathFor } = await import('@/lib/receipts/return-path');
    const path = categoryPath('Divertisment', { month: '2026-07', who: 'me' });
    expect(returnPathFor(path)).toBe(path);
  });
});
