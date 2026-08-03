const TOTAL_KEYWORDS = /total|suma|de plat[ăa]/i;
const AMOUNT_PATTERN = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/;
const AMOUNT_PATTERN_GLOBAL = new RegExp(AMOUNT_PATTERN.source, 'g');
const DMY_DATE_PATTERN = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/;
const YMD_DATE_PATTERN = /(\d{4})-(\d{1,2})-(\d{1,2})/;

export interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
  purchaseDate: string | null;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    merchant: lines[0] ?? null,
    amount: findAmount(lines, text),
    purchaseDate: findDate(text),
  };
}

function findAmount(lines: string[], fullText: string): number | null {
  for (const line of lines) {
    if (TOTAL_KEYWORDS.test(line)) {
      const match = line.match(AMOUNT_PATTERN);
      if (match) {
        const value = parseAmount(match[1]);
        if (value !== null) return value;
      }
    }
  }

  const amounts = [...fullText.matchAll(AMOUNT_PATTERN_GLOBAL)]
    .map((match) => parseAmount(match[1]))
    .filter((value): value is number => value !== null);

  return amounts.length ? Math.max(...amounts) : null;
}

function parseAmount(raw: string): number | null {
  const normalized =
    raw.includes(',') && raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function findDate(text: string): string | null {
  const ymd = text.match(YMD_DATE_PATTERN);
  if (ymd) {
    const [, year, month, day] = ymd;
    return toIsoDate(year, month, day);
  }

  const dmy = text.match(DMY_DATE_PATTERN);
  if (dmy) {
    const [, day, month, rawYear] = dmy;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return toIsoDate(year, month, day);
  }

  return null;
}

function toIsoDate(year: string, month: string, day: string): string | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
