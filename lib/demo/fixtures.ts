import type { ReceiptRow } from '@/lib/dashboard/aggregate';
import { toDateString } from '@/lib/dashboard/aggregate';
import type { HouseholdMemberInfo } from '@/lib/household/membership';
import type { Category } from '@/lib/categories';

/**
 * A household that exists only in this file.
 *
 * It backs `/demo`, which renders the real household screen from these rows —
 * same aggregation, same components — so the page can be looked at without a
 * Google account, and without seeding anything into Postgres. Nothing here is
 * ever written anywhere; the ids are not uuids precisely so a stray row can
 * never be mistaken for a real one.
 */

export const DEMO_HOUSEHOLD_NAME = 'Familia Popescu';

export const DEMO_ANA = 'demo-ana';
export const DEMO_BOGDAN = 'demo-bogdan';

/** Whose eyes the demo is seen through — the one that gets the "(tu)" marker. */
export const DEMO_ME = DEMO_ANA;

export interface DemoMember extends HouseholdMemberInfo {
  role: 'owner' | 'member';
  email: string;
}

export const DEMO_MEMBERS: DemoMember[] = [
  {
    userId: DEMO_ANA,
    displayName: 'Ana Popescu',
    avatarUrl: null,
    role: 'owner',
    email: 'ana@exemplu.ro',
  },
  {
    userId: DEMO_BOGDAN,
    displayName: 'Bogdan Popescu',
    avatarUrl: null,
    role: 'member',
    email: 'bogdan@exemplu.ro',
  },
];

interface DemoExpense {
  who: string;
  merchant: string;
  amount: number;
  category: Category;
  subcategory: string | null;
  source: 'receipt' | 'manual';
  /** Left out for the pending row, which stands in for a scan still being read. */
  status?: string;
  /** Dropped, rather than dated into the future, when the month is younger than this. */
  daysAgo?: number;
  /** For finished months: how far back, and on which day of it. */
  monthsAgo?: number;
  day?: number;
  /** Bucketed by created_at, the way a manual entry with no date given is. */
  noPurchaseDate?: boolean;
}

/**
 * The live month, counted back from today so the demo is never showing an
 * empty "luna aceasta" and never dates an expense into the future. On the
 * first of a month only the `daysAgo: 0` rows survive — which is why both
 * members have one.
 */
const THIS_MONTH: DemoExpense[] = [
  {
    who: DEMO_BOGDAN,
    merchant: 'Kaufland',
    amount: 214.6,
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    source: 'receipt',
    daysAgo: 0,
  },
  {
    who: DEMO_ANA,
    merchant: 'Mega Image',
    amount: 87.3,
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    source: 'receipt',
    daysAgo: 0,
  },
  // Still being read by OCR: it has an amount, and it must not be counted.
  {
    who: DEMO_BOGDAN,
    merchant: 'Bon în procesare',
    amount: 150,
    category: 'Altele',
    subcategory: null,
    source: 'receipt',
    status: 'pending',
    daysAgo: 0,
  },
  {
    who: DEMO_ANA,
    merchant: 'Glovo',
    amount: 64,
    category: 'Mâncare & Băutură',
    subcategory: 'Livrare mâncare',
    source: 'manual',
    daysAgo: 1,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'OMV',
    amount: 320,
    category: 'Transport',
    subcategory: 'Combustibil',
    source: 'receipt',
    daysAgo: 2,
  },
  {
    who: DEMO_ANA,
    merchant: 'Farmacia Tei',
    amount: 48.75,
    category: 'Sănătate & Îngrijire',
    subcategory: 'Farmacie',
    source: 'receipt',
    daysAgo: 3,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'Netflix',
    amount: 55.99,
    category: 'Divertisment',
    subcategory: 'Streaming & Media',
    source: 'manual',
    daysAgo: 4,
    noPurchaseDate: true,
  },
  {
    who: DEMO_ANA,
    merchant: 'Decathlon',
    amount: 259.9,
    category: 'Cumpărături',
    subcategory: 'Îmbrăcăminte & Încălțăminte',
    source: 'receipt',
    daysAgo: 6,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'Enel Energie',
    amount: 412.4,
    category: 'Locuință & Facturi',
    subcategory: 'Utilități',
    source: 'manual',
    daysAgo: 8,
  },
  {
    who: DEMO_ANA,
    merchant: 'Ted Coffee',
    amount: 27.5,
    category: 'Mâncare & Băutură',
    subcategory: 'Cafea & Gustări',
    source: 'receipt',
    daysAgo: 9,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'Profi',
    amount: 96.2,
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    source: 'receipt',
    daysAgo: 11,
  },
  {
    who: DEMO_ANA,
    merchant: 'STB',
    amount: 80,
    category: 'Transport',
    subcategory: 'Transport public',
    source: 'manual',
    daysAgo: 13,
  },
];

/**
 * Two finished months behind it, so stepping back with the month picker lands
 * on something. Days stay at 28 or below — February exists.
 */
const PAST_MONTHS: DemoExpense[] = [
  {
    who: DEMO_ANA,
    merchant: 'Kaufland',
    amount: 302.15,
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    source: 'receipt',
    monthsAgo: 1,
    day: 4,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'OMV',
    amount: 289,
    category: 'Transport',
    subcategory: 'Combustibil',
    source: 'receipt',
    monthsAgo: 1,
    day: 7,
  },
  {
    who: DEMO_ANA,
    merchant: 'Orange',
    amount: 69.99,
    category: 'Locuință & Facturi',
    subcategory: 'Telefon & Internet',
    source: 'manual',
    monthsAgo: 1,
    day: 11,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'eMAG',
    amount: 1249,
    category: 'Cumpărături',
    subcategory: 'Electronice',
    source: 'receipt',
    monthsAgo: 1,
    day: 15,
  },
  {
    who: DEMO_ANA,
    merchant: 'Farmacia Dona',
    amount: 112.4,
    category: 'Sănătate & Îngrijire',
    subcategory: 'Farmacie',
    source: 'receipt',
    monthsAgo: 1,
    day: 20,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'Mega Image',
    amount: 143.75,
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    source: 'receipt',
    monthsAgo: 1,
    day: 24,
  },
  {
    who: DEMO_ANA,
    merchant: 'Cinema City',
    amount: 78,
    category: 'Divertisment',
    subcategory: 'Filme & Jocuri',
    source: 'manual',
    monthsAgo: 1,
    day: 26,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'Lidl',
    amount: 187.2,
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    source: 'receipt',
    monthsAgo: 2,
    day: 3,
  },
  {
    who: DEMO_ANA,
    merchant: 'Rompetrol',
    amount: 240,
    category: 'Transport',
    subcategory: 'Combustibil',
    source: 'receipt',
    monthsAgo: 2,
    day: 9,
  },
  {
    who: DEMO_BOGDAN,
    merchant: 'Enel Energie',
    amount: 386.1,
    category: 'Locuință & Facturi',
    subcategory: 'Utilități',
    source: 'manual',
    monthsAgo: 2,
    day: 14,
  },
  {
    who: DEMO_ANA,
    merchant: 'Zara',
    amount: 349.9,
    category: 'Cumpărături',
    subcategory: 'Îmbrăcăminte & Încălțăminte',
    source: 'receipt',
    monthsAgo: 2,
    day: 22,
  },
];

/** Noon local, so the date survives being read back out of an ISO string. */
function stamp(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString();
}

/**
 * The demo household's expenses as the app's own row shape — so `/demo` runs
 * them through the same aggregation the real screen does, rather than
 * displaying numbers that were written down already totalled.
 */
export function demoReceipts(now = new Date()): ReceiptRow[] {
  const rows: ReceiptRow[] = [];

  for (const e of [...THIS_MONTH, ...PAST_MONTHS]) {
    const date =
      e.daysAgo === undefined
        ? new Date(now.getFullYear(), now.getMonth() - (e.monthsAgo ?? 0), e.day ?? 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - e.daysAgo);

    // Early in a month, the older "days ago" rows would fall into the previous
    // one — where they would sit among expenses already written for it, and
    // change a finished month's totals depending on the day it was looked at.
    if (e.daysAgo !== undefined && date.getMonth() !== now.getMonth()) continue;

    rows.push({
      id: `demo-${rows.length + 1}`,
      user_id: e.who,
      merchant: e.merchant,
      amount: e.amount,
      purchase_date: e.noPurchaseDate ? null : toDateString(date),
      category: e.category,
      subcategory: e.subcategory,
      status: e.status ?? 'processed',
      source: e.source,
      created_at: stamp(date),
    });
  }

  return rows;
}
