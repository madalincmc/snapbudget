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

/** Formats a "YYYY-MM-DD" date string as a short Romanian label, e.g. "12 aug". */
export function formatDayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${Number(day)} ${MONTH_SHORT[Number(month) - 1]}`;
}
