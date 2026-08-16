import { formatListDate } from '@/lib/dashboard/format';

/**
 * The period the expense history is scoped to.
 *
 * A preset is stored by name rather than as the dates it currently stands for,
 * so a bookmarked "luna aceasta" still means *this* month when it is opened
 * next month. Only a custom interval pins real dates.
 */
export const PRESET_PERIODS = [
  'this_month',
  'last_month',
  'last_7',
  'last_30',
  'this_year',
] as const;

export type PresetPeriod = (typeof PRESET_PERIODS)[number];
export type Period = PresetPeriod | 'custom' | 'all';

export interface DateFilter {
  period: Period;
  /** "YYYY-MM-DD", custom periods only. Either end may be absent. */
  from?: string;
  to?: string;
}

/** Inclusive on both ends; a null end is unbounded. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

export const PERIOD_LABELS: Record<PresetPeriod, string> = {
  this_month: 'Luna aceasta',
  last_month: 'Luna trecută',
  last_7: 'Ultimele 7 zile',
  last_30: 'Ultimele 30 de zile',
  this_year: 'Anul acesta',
};

export const ALL_PERIODS_LABEL = 'Toată perioada';

/**
 * A Date as "YYYY-MM-DD" in the *local* timezone.
 *
 * Not `toISOString().slice(0, 10)`, which is UTC: at 01:00 in Bucharest that
 * still reads as yesterday, so "today" would start a day early for every
 * reader east of Greenwich and a day late for everyone west of it.
 */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A real calendar date in "YYYY-MM-DD" form — "2026-02-31" is not one. */
export function isDateKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1) return false;

  // Day 0 of the next month is the last day of this one.
  return day <= new Date(year, month, 0).getDate();
}

/**
 * The interval a filter stands for, or null when it constrains nothing.
 *
 * `now` is the reader's own clock, so every preset is measured in their local
 * timezone: `purchase_date` is a plain `date` column, and resolving these
 * boundaries against UTC instead would move "today" for anyone not on it.
 */
export function resolveDateRange(filter: DateFilter, now = new Date()): DateRange | null {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (filter.period) {
    case 'this_month':
      return {
        from: dateKey(new Date(year, month, 1)),
        to: dateKey(new Date(year, month + 1, 0)),
      };
    case 'last_month':
      return {
        from: dateKey(new Date(year, month - 1, 1)),
        to: dateKey(new Date(year, month, 0)),
      };
    // Counted inclusive of today: "the last 7 days" a reader means covers this
    // evening's shopping, not the week that ended last night.
    case 'last_7':
      return { from: dateKey(new Date(year, month, now.getDate() - 6)), to: dateKey(now) };
    case 'last_30':
      return { from: dateKey(new Date(year, month, now.getDate() - 29)), to: dateKey(now) };
    case 'this_year':
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    case 'custom': {
      const from = isDateKey(filter.from) ? filter.from : null;
      const to = isDateKey(filter.to) ? filter.to : null;
      if (!from && !to) return null;
      // Entered back to front, which is a slip rather than a request for zero
      // results — read it as the interval the reader meant to draw.
      return from && to && from > to ? { from: to, to: from } : { from, to };
    }
    default:
      return null;
  }
}

export interface RawDateParams {
  period?: string;
  from?: string;
  to?: string;
  /** The "MM" + "YYYY" pair written by the month select this filter replaced. */
  month?: string;
  year?: string;
}

/**
 * A filter built from untrusted query-string values.
 *
 * It still understands the `month`/`year` pair the old month select wrote, so
 * a link shared or bookmarked before this filter existed opens on the period
 * it was pointing at rather than silently widening to everything.
 */
export function normalizeDateFilter(raw: RawDateParams = {}): DateFilter {
  if (PRESET_PERIODS.includes(raw.period as PresetPeriod)) {
    return { period: raw.period as PresetPeriod };
  }

  if (raw.period === 'custom') {
    const from = isDateKey(raw.from) ? raw.from : undefined;
    const to = isDateKey(raw.to) ? raw.to : undefined;
    return from || to ? { period: 'custom', from, to } : { period: 'all' };
  }

  if (/^(0[1-9]|1[0-2])$/.test(raw.month ?? '') && /^\d{4}$/.test(raw.year ?? '')) {
    const year = Number(raw.year);
    const month = Number(raw.month);
    return {
      period: 'custom',
      from: `${raw.year}-${raw.month}-01`,
      to: dateKey(new Date(year, month, 0)),
    };
  }

  return { period: 'all' };
}

/**
 * The query parameters that carry a filter — the same shape in the address bar
 * and in the `returnTo` a row links back to.
 *
 * Deliberately the chosen filter and not the resolved interval: those dates
 * come from the reader's clock, and putting them in a link rendered on the
 * server would make the markup disagree with the browser's.
 */
export function dateFilterParams(filter: DateFilter): Record<string, string> {
  if (filter.period === 'all') return {};
  if (filter.period !== 'custom') return { period: filter.period };

  const params: Record<string, string> = { period: 'custom' };
  if (isDateKey(filter.from)) params.from = filter.from;
  if (isDateKey(filter.to)) params.to = filter.to;
  return params;
}

/**
 * The active period, for the line above the results.
 *
 * A preset is named rather than spelled out in dates: the name is what was
 * chosen, it stays short on a phone, and it renders the same on the server as
 * in the browser — which an interval derived from the reader's clock would not.
 */
export function describeDateRange(filter: DateFilter): string {
  if (filter.period === 'all') return ALL_PERIODS_LABEL;
  if (filter.period !== 'custom') return PERIOD_LABELS[filter.period];

  const from = isDateKey(filter.from) ? filter.from : null;
  const to = isDateKey(filter.to) ? filter.to : null;
  const [start, end] = from && to && from > to ? [to, from] : [from, to];

  if (start && end) return `${formatListDate(start)} – ${formatListDate(end)}`;
  if (start) return `Din ${formatListDate(start)}`;
  if (end) return `Până la ${formatListDate(end)}`;
  return ALL_PERIODS_LABEL;
}
