import { describe, expect, it } from 'vitest';
import { returnPathFor } from '@/lib/receipts/return-path';

describe('returnPathFor', () => {
  it('defaults to the dashboard', () => {
    expect(returnPathFor(undefined)).toBe('/dashboard');
    expect(returnPathFor('')).toBe('/dashboard');
  });

  it('keeps the known routes, query string and all', () => {
    expect(returnPathFor('/dashboard')).toBe('/dashboard');
    expect(returnPathFor('/history?category=Transport&sort=amount')).toBe(
      '/history?category=Transport&sort=amount',
    );
  });

  it('keeps a category screen addressed by a real token', () => {
    expect(returnPathFor('/categories/food')).toBe('/categories/food');
    expect(returnPathFor('/categories/transport?month=2026-07')).toBe(
      '/categories/transport?month=2026-07',
    );
  });

  it('rejects a category path that would 404', () => {
    expect(returnPathFor('/categories/groceries')).toBe('/dashboard');
    expect(returnPathFor('/categories')).toBe('/dashboard');
    expect(returnPathFor('/categories/food/extra')).toBe('/dashboard');
  });

  it('rejects anything that would leave the app', () => {
    expect(returnPathFor('//evil.com')).toBe('/dashboard');
    expect(returnPathFor('https://evil.com')).toBe('/dashboard');
    expect(returnPathFor('/settings')).toBe('/dashboard');
  });
});
