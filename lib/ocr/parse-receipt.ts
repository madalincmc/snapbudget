import { matchKnownMerchant } from './merchants';

/** A money figure with decimals: 153,00 · 393.46 · 1.234,56 */
const AMOUNT = String.raw`\d{1,3}(?:[.,]\d{3})*[.,]\d{2}`;
const AMOUNT_GLOBAL = new RegExp(AMOUNT, 'g');
/** The whole line is one figure, give or take a currency mark or a VAT letter. */
const AMOUNT_ONLY = new RegExp(String.raw`^\W{0,3}(${AMOUNT})\s*[A-EȘ]?\.?$`);

/** Says "this is the amount due". */
const TOTAL_LABEL = /de\s*plat|\btotal\b|\bsuma\b/i;
/**
 * Says "this is some other figure". Checked first, because most of these
 * contain the word the positive test is looking for: SUBTOTAL and TOTAL TVA
 * both match /total/, and the old parser took whichever came first — usually
 * the subtotal, printed above the real total.
 */
const NOT_TOTAL_LABEL = /subtotal|\btva\b|\brest\b|bac[sș]i[sș]|discount|reducere|puncte|bonus/i;
/** "DE PLATA" is what is actually owed, so it outranks a bare "TOTAL". */
const DUE_LABEL = /de\s*plat/i;

const DATE_LINE = /\bdat[ăa]\b/i;
const DMY_DATE = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/g;
const YMD_DATE = /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/g;

/** Header junk: ids, fiscal codes, addresses, table and receipt numbers. */
const MERCHANT_REJECT =
  /^(masa|nota|not[ăa]|ospatar|osp[ăa]tar|chelner|casier|casa|bon|client|data|ora|tel|fax|mobil|cif|cui|c\.u\.i|nr|reg|s\/n|id|tid|mid|aid|itd|wid|serie|logout|subtotal|total)\b[\s.:]/i;
const MERCHANT_REJECT_ANY =
  /cod\s*(identificare|fiscal)|c\.?i\.?f\.?[:\s]|c\.?u\.?i\.?[:\s]|reg\.?\s*com|\bRO\d{6,}\b|bon\s*fiscal|factur[ăa]|chitan[țt][ăa]|\bstr\.|\bbd\.|b-dul|\bnr\.|\bjud\.|sector\s*\d|cod\s*po[sș]tal/i;
/** A company suffix all but settles it. */
const LEGAL_SUFFIX = /\b(s\.?r\.?l|s\.?a|p\.?f\.?a|s\.?n\.?c|i\.?i|srl|pfa)\b\.?$/i;
/**
 * Words that are never a business on their own. Point-of-sale screenshots are
 * full of them — a restaurant bill photographed off the till came through as
 * "Logout", the button next to the table number.
 */
const MERCHANT_REJECT_EXACT =
  /^(logout|login|meniu|menu|cash|card|numerar|client|casa|cas[ăa]|bon|not[ăa]|nota|masa|mas[ăa]|total|subtotal|rest|tva|lei|ron|copie|duplicat|print|listare)$/i;

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
    merchant: findMerchant(lines, text),
    amount: findAmount(lines, text),
    purchaseDate: findDate(lines, text),
  };
}

/* -------------------------------------------------------------------------- */
/* Merchant                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A known chain first, then the most name-like line in the header.
 *
 * Returning null is a real answer here, not a failure to try. The previous
 * version took line one unconditionally and so stored a table number as a
 * business; an empty field the user can fill costs them one edit, whilst a
 * confident wrong one has to be noticed before it can be corrected.
 */
function findMerchant(lines: string[], text: string): string | null {
  const known = matchKnownMerchant(text);
  if (known) return known;

  let best: { line: string; score: number } | null = null;

  for (const [index, line] of lines.slice(0, 8).entries()) {
    // The name is printed above the purchase, always. Once the item list
    // starts there is nothing left to find, and product lines score as well
    // as a shop name does — this is what turned a pizza into a merchant.
    if (isItemLine(line)) break;

    const score = scoreMerchantLine(line, index);
    if (score > 0 && (!best || score > best.score)) best = { line, score };
  }

  return best ? tidyMerchant(best.line) : null;
}

/** A price on its own, or a line opening with a quantity. */
function isItemLine(line: string): boolean {
  return amountOnly(line) !== null || /^\d/.test(tidyMerchant(line));
}

function scoreMerchantLine(line: string, index: number): number {
  const tidied = tidyMerchant(line);
  if (tidied.length < 3 || tidied.length > 42) return 0;
  if (MERCHANT_REJECT_EXACT.test(tidied)) return 0;
  if (MERCHANT_REJECT.test(tidied) || MERCHANT_REJECT_ANY.test(tidied)) return 0;

  const letters = (tidied.match(/\p{L}/gu) ?? []).length;
  const digits = (tidied.match(/\d/gu) ?? []).length;
  // A line that is mostly digits is an id, a price or a phone number.
  if (letters < 3 || digits > letters) return 0;

  let score = 10;
  if (LEGAL_SUFFIX.test(tidied)) score += 30;
  // Shop names are usually set in caps at the top of the slip.
  if (tidied === tidied.toUpperCase() && letters >= 4) score += 5;
  // Earlier is better, but only as a tiebreak.
  score += Math.max(0, 8 - index);

  return score;
}

/** Drops OCR'd logo glyphs and collapses runs of spaces. */
function tidyMerchant(line: string): string {
  return line
    .replace(/^[^\p{L}\d]+/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Amount                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Receipts print labels and figures in two columns, which OCR flattens into a
 * run of labels followed by a run of figures:
 *
 *     Subtotal:        <- label 0
 *     De plata:        <- label 1
 *     153,00           <- figure 0
 *     153,00           <- figure 1
 *
 * So a label carrying no figure of its own is matched to the figure at the
 * same offset in the following run. The old parser only ever looked on the
 * label's own line, found nothing on layouts like this, and fell through to
 * "largest number anywhere in the text" — which happened to be right on the
 * receipts to hand and is wrong as soon as a total is not the biggest figure
 * printed.
 */
function findAmount(lines: string[], fullText: string): number | null {
  const candidates: { value: number; score: number }[] = [];

  const consider = (value: number | null, score: number) => {
    if (value !== null && value > 0) candidates.push({ value, score });
  };

  for (const [index, line] of lines.entries()) {
    if (NOT_TOTAL_LABEL.test(line) || !TOTAL_LABEL.test(line)) continue;
    const score = DUE_LABEL.test(line) ? 100 : 80;

    // Figure on the label's own line: take the last, since totals are printed
    // to the right of anything else on the row ("TOTAL 3 ART 45,20").
    const inline = line.match(AMOUNT_GLOBAL);
    if (inline?.length) {
      consider(parseAmount(inline[inline.length - 1]), score);
      continue;
    }

    consider(pairedFigure(lines, index), score - 5);
  }

  if (candidates.length) {
    return candidates.reduce((a, b) => (b.score > a.score ? b : a)).value;
  }

  // Nothing labelled. The largest figure is a guess, but a receipt's total is
  // usually its biggest number, and a wrong amount the user can see and edit
  // beats an empty one they have to work out themselves.
  const amounts = [...fullText.matchAll(AMOUNT_GLOBAL)]
    .map((match) => parseAmount(match[0]))
    .filter((value): value is number => value !== null);

  return amounts.length ? Math.max(...amounts) : null;
}

/** The figure sitting at this label's offset within the next run of figures. */
function pairedFigure(lines: string[], labelIndex: number): number | null {
  let start = labelIndex;
  while (start > 0 && isLabelLine(lines[start - 1])) start--;
  const offset = labelIndex - start;

  let cursor = labelIndex + 1;
  while (cursor < lines.length && isLabelLine(lines[cursor])) cursor++;

  const figures: number[] = [];
  while (cursor < lines.length) {
    const value = amountOnly(lines[cursor]);
    if (value === null) break;
    figures.push(value);
    cursor++;
  }

  if (!figures.length) return null;
  return figures[offset] ?? figures[figures.length - 1];
}

/**
 * A label carries no digits at all, or ends in a colon. Requiring that keeps
 * product lines ("EFIX S BENZINA 98 - POMPA 1") out of the run, which would
 * otherwise shift every offset below them by one.
 */
function isLabelLine(line: string): boolean {
  if (amountOnly(line) !== null) return false;
  if (!/\p{L}/u.test(line)) return false;
  return !/\d/.test(line) || line.endsWith(':');
}

function amountOnly(line: string): number | null {
  const match = line.match(AMOUNT_ONLY);
  return match ? parseAmount(match[1]) : null;
}

function parseAmount(raw: string): number | null {
  const normalized =
    raw.includes(',') && raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/* -------------------------------------------------------------------------- */
/* Date                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A line saying "DATA:" first, then anywhere in the text — and in both cases
 * the first candidate that is a real, plausible date rather than the first
 * one that merely matches the shape. The old version validated only its first
 * match and gave up on it, so a version string or a serial number ahead of the
 * real date meant no date at all.
 */
function findDate(lines: string[], text: string): string | null {
  for (const line of lines) {
    if (!DATE_LINE.test(line)) continue;
    const dated = firstValidDate(line);
    if (dated) return dated;
  }

  return firstValidDate(text);
}

function firstValidDate(source: string): string | null {
  const candidates: { iso: string; index: number }[] = [];

  for (const match of source.matchAll(YMD_DATE)) {
    const iso = toIsoDate(match[1], match[2], match[3]);
    if (iso) candidates.push({ iso, index: match.index ?? 0 });
  }
  for (const match of source.matchAll(DMY_DATE)) {
    const rawYear = match[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const iso = toIsoDate(year, match[2], match[1]);
    if (iso) candidates.push({ iso, index: match.index ?? 0 });
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates[0]?.iso ?? null;
}

function toIsoDate(year: string, month: string, day: string): string | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // A receipt is not from 1998 and not from next year. Anything outside that
  // is a serial number, a card expiry or a misread.
  const now = new Date();
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.getUTCMonth() !== m - 1) return null;
  const ageDays = (now.getTime() - parsed.getTime()) / 86_400_000;
  if (ageDays < -2 || ageDays > 3650) return null;

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
