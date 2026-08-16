import { describe, expect, it } from 'vitest';
import {
  dateFilterParams,
  dateKey,
  describeDateRange,
  isDateKey,
  normalizeDateFilter,
  resolveDateRange,
  type DateFilter,
} from '@/lib/history/date-range';

/** 15 August 2026, local time — the clock every preset below is measured on. */
const now = new Date(2026, 7, 15);

describe('dateKey', () => {
  it('reads the date off the local clock rather than off UTC', () => {
    // Every hour of the same local day is that day. Through toISOString() the
    // first and last of these would land on a neighbouring date in any
    // timezone but UTC — which is the shift this function exists to avoid.
    for (const hour of [0, 12, 23]) {
      expect(dateKey(new Date(2026, 6, 15, hour, 30))).toBe('2026-07-15');
    }
  });

  it('pads month and day', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('isDateKey', () => {
  it('accepts a real calendar date', () => {
    expect(isDateKey('2026-08-15')).toBe(true);
    expect(isDateKey('2024-02-29')).toBe(true);
  });

  it('rejects a date that does not exist', () => {
    expect(isDateKey('2026-02-31')).toBe(false);
    expect(isDateKey('2026-13-01')).toBe(false);
    expect(isDateKey('2026-00-10')).toBe(false);
    expect(isDateKey('2026-08-00')).toBe(false);
    // Not a leap year, so there is no 29th.
    expect(isDateKey('2026-02-29')).toBe(false);
  });

  it('rejects anything that is not the shape at all', () => {
    for (const value of ['', '2026-08', '15/08/2026', 'ieri', undefined, null]) {
      expect(isDateKey(value)).toBe(false);
    }
  });
});

describe('resolveDateRange', () => {
  it('constrains nothing when no period is chosen', () => {
    expect(resolveDateRange({ period: 'all' }, now)).toBeNull();
  });

  it('covers the whole of the current month', () => {
    expect(resolveDateRange({ period: 'this_month' }, now)).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('does not spill out of a month it is asked for from the last day of it', () => {
    expect(resolveDateRange({ period: 'this_month' }, new Date(2026, 0, 31))).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });

  it('steps back over a year boundary for last month', () => {
    expect(resolveDateRange({ period: 'last_month' }, new Date(2026, 0, 10))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('ends last month on its own last day, not on the current day number', () => {
    // Asked on 31 March, "last month" is February — which has no 31st.
    expect(resolveDateRange({ period: 'last_month' }, new Date(2026, 2, 31))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('counts the last 7 and 30 days inclusive of today', () => {
    expect(resolveDateRange({ period: 'last_7' }, now)).toEqual({
      from: '2026-08-09',
      to: '2026-08-15',
    });
    // 15 days of July plus 15 of August.
    expect(resolveDateRange({ period: 'last_30' }, now)).toEqual({
      from: '2026-07-17',
      to: '2026-08-15',
    });
  });

  it('covers the whole calendar year', () => {
    expect(resolveDateRange({ period: 'this_year' }, now)).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  it('takes a custom interval as given', () => {
    expect(resolveDateRange({ period: 'custom', from: '2026-07-15', to: '2026-08-15' })).toEqual({
      from: '2026-07-15',
      to: '2026-08-15',
    });
  });

  it('reads an interval entered back to front the way it was meant', () => {
    expect(resolveDateRange({ period: 'custom', from: '2026-08-15', to: '2026-07-15' })).toEqual({
      from: '2026-07-15',
      to: '2026-08-15',
    });
  });

  it('leaves an end open when only one was given', () => {
    expect(resolveDateRange({ period: 'custom', from: '2026-03-01' })).toEqual({
      from: '2026-03-01',
      to: null,
    });
    expect(resolveDateRange({ period: 'custom', to: '2026-03-01' })).toEqual({
      from: null,
      to: '2026-03-01',
    });
  });

  it('constrains nothing when a custom interval has no usable end', () => {
    expect(resolveDateRange({ period: 'custom' })).toBeNull();
    expect(resolveDateRange({ period: 'custom', from: '2026-02-31', to: 'ieri' })).toBeNull();
  });

  it('is measured on the clock it is handed', () => {
    const dates = new Set(
      [new Date(2026, 7, 15), new Date(2026, 7, 16)].map(
        (clock) => resolveDateRange({ period: 'last_7' }, clock)!.to,
      ),
    );
    expect(dates).toEqual(new Set(['2026-08-15', '2026-08-16']));
  });
});

describe('normalizeDateFilter', () => {
  it('keeps a period it knows', () => {
    expect(normalizeDateFilter({ period: 'last_30' })).toEqual({ period: 'last_30' });
  });

  it('falls back to everything on a period it does not know', () => {
    expect(normalizeDateFilter({ period: 'last_decade' })).toEqual({ period: 'all' });
    expect(normalizeDateFilter({})).toEqual({ period: 'all' });
    expect(normalizeDateFilter()).toEqual({ period: 'all' });
  });

  it('keeps a custom interval, dropping an end it cannot read', () => {
    expect(normalizeDateFilter({ period: 'custom', from: '2026-07-15', to: '2026-08-15' })).toEqual(
      { period: 'custom', from: '2026-07-15', to: '2026-08-15' },
    );
    expect(normalizeDateFilter({ period: 'custom', from: '2026-07-15', to: 'oricând' })).toEqual({
      period: 'custom',
      from: '2026-07-15',
      to: undefined,
    });
  });

  it('falls back to everything when a custom interval has no usable end', () => {
    expect(normalizeDateFilter({ period: 'custom' })).toEqual({ period: 'all' });
    expect(normalizeDateFilter({ period: 'custom', from: '2026-02-31' })).toEqual({
      period: 'all',
    });
  });

  it('opens a link written by the old month select on the month it named', () => {
    expect(normalizeDateFilter({ month: '07', year: '2025' })).toEqual({
      period: 'custom',
      from: '2025-07-01',
      to: '2025-07-31',
    });
    // February of a leap year still ends on its own last day.
    expect(normalizeDateFilter({ month: '02', year: '2024' })).toEqual({
      period: 'custom',
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });

  it('ignores an old month parameter that is incomplete or impossible', () => {
    expect(normalizeDateFilter({ month: '07' })).toEqual({ period: 'all' });
    expect(normalizeDateFilter({ month: '13', year: '2025' })).toEqual({ period: 'all' });
    expect(normalizeDateFilter({ month: 'all', year: '2025' })).toEqual({ period: 'all' });
  });

  it('lets an explicit period win over a leftover month parameter', () => {
    expect(normalizeDateFilter({ period: 'this_year', month: '07', year: '2025' })).toEqual({
      period: 'this_year',
    });
  });
});

describe('dateFilterParams', () => {
  it('writes nothing for the default', () => {
    expect(dateFilterParams({ period: 'all' })).toEqual({});
  });

  it('writes a preset by name, not as the dates it currently means', () => {
    expect(dateFilterParams({ period: 'this_month' })).toEqual({ period: 'this_month' });
  });

  it('writes both ends of a custom interval, dropping one it cannot read', () => {
    expect(dateFilterParams({ period: 'custom', from: '2026-07-15', to: '2026-08-15' })).toEqual({
      period: 'custom',
      from: '2026-07-15',
      to: '2026-08-15',
    });
    expect(dateFilterParams({ period: 'custom', from: '2026-07-15', to: 'x' })).toEqual({
      period: 'custom',
      from: '2026-07-15',
    });
  });

  it('round-trips through normalizeDateFilter', () => {
    const filters: DateFilter[] = [
      { period: 'all' },
      { period: 'last_7' },
      { period: 'this_year' },
      { period: 'custom', from: '2026-07-15', to: '2026-08-15' },
      { period: 'custom', from: '2026-07-15' },
    ];

    for (const filter of filters) {
      expect(normalizeDateFilter(dateFilterParams(filter)), filter.period).toEqual(filter);
    }
  });
});

describe('describeDateRange', () => {
  // The year is spelled out only when it is not the current one, so the labels
  // below are pinned to whichever year the suite runs in.
  const year = new Date().getFullYear();

  it('names a preset rather than spelling out its dates', () => {
    expect(describeDateRange({ period: 'this_month' })).toBe('Luna aceasta');
    expect(describeDateRange({ period: 'last_30' })).toBe('Ultimele 30 de zile');
    expect(describeDateRange({ period: 'all' })).toBe('Toată perioada');
  });

  it('spells out a custom interval', () => {
    expect(
      describeDateRange({ period: 'custom', from: `${year}-07-15`, to: `${year}-08-15` }),
    ).toBe('15 iul – 15 aug');
  });

  it('describes an interval entered back to front the way it reads forwards', () => {
    expect(
      describeDateRange({ period: 'custom', from: `${year}-08-15`, to: `${year}-07-15` }),
    ).toBe('15 iul – 15 aug');
  });

  it('keeps the year on an interval that is not in this one', () => {
    expect(describeDateRange({ period: 'custom', from: '2019-07-15', to: '2019-08-15' })).toBe(
      '15 iul 2019 – 15 aug 2019',
    );
  });

  it('says which end is open when only one was given', () => {
    expect(describeDateRange({ period: 'custom', from: `${year}-03-01` })).toBe('Din 1 mar');
    expect(describeDateRange({ period: 'custom', to: `${year}-03-01` })).toBe('Până la 1 mar');
  });
});
