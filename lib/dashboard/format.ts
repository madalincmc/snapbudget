const MONTH_SHORT = [
  'ian',
  'feb',
  'mar',
  'apr',
  'mai',
  'iun',
  'iul',
  'aug',
  'sep',
  'oct',
  'noi',
  'dec',
];

const MONTH_LONG = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
];

/** Formats a "YYYY-MM-DD" date string as a short Romanian label, e.g. "12 aug". */
export function formatDayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${Number(day)} ${MONTH_SHORT[Number(month) - 1]}`;
}

/**
 * Date for expense lists. Drops the year while it matches the current one —
 * "12 aug" reads instantly, "2026-08-12" does not — and keeps it otherwise so
 * older entries stay unambiguous. Splits the string rather than going through
 * Date, which would shift a UTC midnight back a day in western timezones.
 */
export function formatListDate(dateStr: string, now = new Date()): string {
  const [year, month, day] = dateStr.slice(0, 10).split('-');
  const label = `${Number(day)} ${MONTH_SHORT[Number(month) - 1]}`;
  return Number(year) === now.getFullYear() ? label : `${label} ${year}`;
}

/** Full month name, e.g. "august" — used for the dashboard's period heading. */
export function monthName(date: Date): string {
  return MONTH_LONG[date.getMonth()];
}

/** The month before `date`, as a name — for the comparison line. */
export function previousMonthName(date: Date): string {
  return MONTH_LONG[(date.getMonth() + 11) % 12];
}

/**
 * A "YYYY-MM" key as a month name, e.g. "august". The year is appended only
 * when it is not the current one, so the common case stays short and an older
 * month is never ambiguous — same rule as formatListDate.
 */
export function monthKeyLabel(key: string, now = new Date()): string {
  const [year, month] = key.split('-');
  const name = MONTH_LONG[Number(month) - 1];
  return Number(year) === now.getFullYear() ? name : `${name} ${year}`;
}

/** Compact form for chart axes, e.g. "aug" — with a year suffix only in January. */
export function monthKeyShortLabel(key: string): string {
  const [year, month] = key.split('-');
  const name = MONTH_SHORT[Number(month) - 1];
  // Labelling every bar with a year is noise; marking each January is enough
  // to place a twelve-month axis that spans a year boundary.
  return month === '01' ? `${name} ${year.slice(2)}` : name;
}
