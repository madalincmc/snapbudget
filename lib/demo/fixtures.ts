import { toDateString, type ReceiptRow } from '@/lib/dashboard/aggregate';
import type { HouseholdMemberInfo } from '@/lib/household/membership';
import type { Budget } from '@/lib/budgets';
import type { Category } from '@/lib/categories';

/**
 * A household that exists only in this file.
 *
 * It backs `/demo` — the dashboard, the history and the household screen —
 * which render from these rows through the app's own aggregation, so the
 * screens can be looked at without a Google account and without seeding
 * anything into Postgres. Nothing here is ever written anywhere; the ids are
 * not uuids precisely so a stray row can never be mistaken for a real one.
 */

export const DEMO_HOUSEHOLD_NAME = 'Familia Popescu';
export const DEMO_HOUSEHOLD_ID = 'demo-household';

export const DEMO_ANA = 'demo-ana';
export const DEMO_BOGDAN = 'demo-bogdan';

/** Whose eyes the demo is seen through — the one that gets the "(tu)" marker. */
export const DEMO_ME = DEMO_ANA;
export const DEMO_ME_FIRST_NAME = 'Ana';

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

/**
 * Household limits, plus a personal one for Ana — so the dashboard's budget
 * line changes with the "who" filter here the way it does in the app, rather
 * than being a single number that ignores the switch above it.
 */
export const DEMO_HOUSEHOLD_BUDGETS: Budget[] = [
  { id: 'demo-budget-all', category: null, amount: 4500, householdId: DEMO_HOUSEHOLD_ID },
  {
    id: 'demo-budget-food',
    category: 'Mâncare & Băutură',
    amount: 1200,
    householdId: DEMO_HOUSEHOLD_ID,
  },
  {
    id: 'demo-budget-transport',
    category: 'Transport',
    amount: 700,
    householdId: DEMO_HOUSEHOLD_ID,
  },
];

export const DEMO_PERSONAL_BUDGETS: Budget[] = [
  { id: 'demo-budget-ana', category: null, amount: 1800, householdId: null },
];

interface DemoExpense {
  who: string;
  merchant: string;
  amount: number;
  category: Category;
  subcategory: string | null;
  source: 'receipt' | 'manual' | 'recurring';
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
    source: 'recurring',
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
    source: 'recurring',
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
 * The two months behind it, written out so the recent past is deliberate
 * rather than generated — the eMAG purchase is there to give the analytics an
 * outlier and the category breakdown a month it does not dominate.
 */
const RECENT_MONTHS: DemoExpense[] = [
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
    source: 'recurring',
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
    source: 'recurring',
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

/** Where the older months are drawn from, with the range each shop lands in. */
const POOL: {
  merchant: string;
  category: Category;
  subcategory: string;
  min: number;
  max: number;
  source?: 'receipt' | 'manual' | 'recurring';
}[] = [
  {
    merchant: 'Kaufland',
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    min: 90,
    max: 320,
  },
  {
    merchant: 'Mega Image',
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    min: 40,
    max: 165,
  },
  { merchant: 'Lidl', category: 'Mâncare & Băutură', subcategory: 'Alimente', min: 60, max: 210 },
  {
    merchant: 'La Mama',
    category: 'Mâncare & Băutură',
    subcategory: 'Restaurante',
    min: 95,
    max: 260,
  },
  {
    merchant: 'Glovo',
    category: 'Mâncare & Băutură',
    subcategory: 'Livrare mâncare',
    min: 38,
    max: 110,
    source: 'manual',
  },
  {
    merchant: 'Ted Coffee',
    category: 'Mâncare & Băutură',
    subcategory: 'Cafea & Gustări',
    min: 15,
    max: 45,
  },
  { merchant: 'OMV', category: 'Transport', subcategory: 'Combustibil', min: 180, max: 350 },
  { merchant: 'Rompetrol', category: 'Transport', subcategory: 'Combustibil', min: 150, max: 330 },
  {
    merchant: 'Bolt',
    category: 'Transport',
    subcategory: 'Taxi & Ridesharing',
    min: 18,
    max: 70,
    source: 'manual',
  },
  {
    merchant: 'Enel Energie',
    category: 'Locuință & Facturi',
    subcategory: 'Utilități',
    min: 210,
    max: 480,
    source: 'recurring',
  },
  {
    merchant: 'Orange',
    category: 'Locuință & Facturi',
    subcategory: 'Telefon & Internet',
    min: 60,
    max: 120,
    source: 'recurring',
  },
  {
    merchant: 'Netflix',
    category: 'Divertisment',
    subcategory: 'Streaming & Media',
    min: 55.99,
    max: 55.99,
    source: 'recurring',
  },
  {
    merchant: 'Cinema City',
    category: 'Divertisment',
    subcategory: 'Filme & Jocuri',
    min: 45,
    max: 120,
  },
  {
    merchant: 'Farmacia Tei',
    category: 'Sănătate & Îngrijire',
    subcategory: 'Farmacie',
    min: 30,
    max: 160,
  },
  {
    merchant: 'World Class',
    category: 'Sănătate & Îngrijire',
    subcategory: 'Sport & Fitness',
    min: 199,
    max: 199,
    source: 'recurring',
  },
  {
    merchant: 'Decathlon',
    category: 'Cumpărături',
    subcategory: 'Îmbrăcăminte & Încălțăminte',
    min: 90,
    max: 350,
  },
  { merchant: 'eMAG', category: 'Cumpărături', subcategory: 'Electronice', min: 120, max: 900 },
  {
    merchant: 'Librăria Humanitas',
    category: 'Familie & Educație',
    subcategory: 'Educație & Cursuri',
    min: 45,
    max: 180,
  },
];

/**
 * Deterministic, so every render of a given month shows the same numbers —
 * two people looking at the demo are looking at the same household, and a
 * screenshot taken today still matches the page tomorrow.
 */
function seeded(seed: number): () => number {
  let state = seed * 2654435761;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * The rest of the year, so the month picker has somewhere to go and the
 * twelve-month view is not mostly empty. Written by rule rather than by hand
 * because nine months of plausible shopping is not worth typing out, and
 * nothing in these months is being asserted on.
 */
function olderMonths(): DemoExpense[] {
  const rows: DemoExpense[] = [];

  for (let monthsAgo = 3; monthsAgo <= 11; monthsAgo++) {
    const random = seeded(monthsAgo + 7);
    const count = 7 + Math.floor(random() * 3);
    const days = new Set<number>();

    for (let i = 0; i < count; i++) {
      const pick = POOL[Math.floor(random() * POOL.length)];
      const amount = Math.round((pick.min + random() * (pick.max - pick.min)) * 100) / 100;

      // Distinct days, so a month does not stack four expenses on the 12th.
      let day = 1 + Math.floor(random() * 27);
      while (days.has(day)) day = (day % 27) + 1;
      days.add(day);

      rows.push({
        who: random() < 0.5 ? DEMO_ANA : DEMO_BOGDAN,
        merchant: pick.merchant,
        amount,
        category: pick.category,
        subcategory: pick.subcategory,
        source: pick.source ?? 'receipt',
        monthsAgo,
        day,
      });
    }
  }

  return rows;
}

const OLDER_MONTHS = olderMonths();

/** Noon local, so the date survives being read back out of an ISO string. */
function stamp(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString();
}

/**
 * The demo household's expenses as the app's own row shape — so the demo
 * screens run them through the same aggregation the real ones do, rather than
 * displaying numbers that were written down already totalled.
 */
export function demoReceipts(now = new Date()): ReceiptRow[] {
  const rows: ReceiptRow[] = [];

  for (const e of [...THIS_MONTH, ...RECENT_MONTHS, ...OLDER_MONTHS]) {
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
