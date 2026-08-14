/**
 * Main categories drive dashboard charts and OCR categorization.
 * Subcategories are optional, finer-grained detail shown in lists/detail
 * views only — never charted separately (see MAD-60).
 */
export const CATEGORIES = [
  'Mâncare & Băutură',
  'Transport',
  'Locuință & Facturi',
  'Sănătate & Îngrijire',
  'Cumpărături',
  'Familie & Educație',
  'Divertisment',
  'Financiar',
  'Altele',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Subcategories name *what was bought*, never how it was paid for. The old
 * "Abonamente" broke that rule and behaved accordingly: sitting under
 * Divertisment, it collected the phone plan, the gym and software licences
 * alongside Netflix, because a monthly charge is the one thing they share.
 *
 * "Facturi" in the housing label is load-bearing. A phone plan is not a
 * property of the dwelling, so under a bare "Casă" it reads as misfiled — it
 * belongs there as a recurring bill, and the name has to say so.
 *
 * Cash withdrawals are deliberately absent: a withdrawal is a transfer, not
 * spending, and recording it counted the same money twice — once on the way
 * out of the account and again when the cash was actually spent.
 */
export const SUBCATEGORIES: Record<Category, readonly string[]> = {
  'Mâncare & Băutură': ['Alimente', 'Restaurante', 'Cafea & Gustări', 'Livrare mâncare'],
  Transport: [
    'Combustibil',
    'Transport public',
    'Taxi & Ridesharing',
    'Parcare & Drum',
    'Întreținere auto',
  ],
  'Locuință & Facturi': [
    'Chirie / Rată',
    'Utilități',
    'Telefon & Internet',
    'Întreținere & Reparații',
  ],
  'Sănătate & Îngrijire': ['Farmacie', 'Medical', 'Sport & Fitness', 'Îngrijire personală'],
  Cumpărături: ['Îmbrăcăminte & Încălțăminte', 'Electronice', 'Casă & Decor', 'Cadouri'],
  'Familie & Educație': ['Copii', 'Educație & Cursuri', 'Animale de companie'],
  Divertisment: [
    'Streaming & Media',
    'Filme & Jocuri',
    'Ieșiri & Evenimente',
    'Călătorii & Cazare',
  ],
  Financiar: [
    'Comisioane bancare',
    'Asigurări',
    'Taxe & Impozite',
    'Rate & Credite',
    'Economii & Investiții',
  ],
  Altele: ['Donații', 'Neclasificat'],
};

/**
 * Category identity lives in CSS variables (`--cat-*` in globals.css), not in
 * hex literals here.
 *
 * Three things follow from that. The light/dark pair for a hue is chosen once,
 * in one place, instead of being restated in a `dark:` half of every class
 * string; the same token drives a `bg-`, a `fill-` and a `text-` utility, so an
 * HTML bar and an SVG mark are the same colour by construction rather than by
 * two maps agreeing; and the hues stay *outside* the four palettes, because
 * they encode which category this is — a reader who learned Transport is
 * orange must not have it repainted for choosing a different accent.
 *
 * The eight hues are validated as a categorical palette: worst adjacent pair
 * ΔE 12.9 light / 10.5 dark under deuteranopia (target ≥ 8), and every `-ink`
 * step clears 4.5:1 as text on its own surface. "Altele" is a residual bucket
 * rather than a spending identity, so it takes a neutral instead of a ninth
 * hue — which is also why the set stays inside the eight-slot ceiling.
 */

/**
 * Token stem per category — `--cat-food`, `--cat-food-ink`, `bg-cat-food`, …
 *
 * The stems are deliberately short English words rather than slugs of the
 * labels, so renaming a category is a one-line change here: "Casă" became
 * "Locuință & Facturi" without touching a single custom property, and the
 * validated palette carried over untouched.
 */
export const CATEGORY_TOKEN: Record<Category, string> = {
  'Mâncare & Băutură': 'food',
  Transport: 'transport',
  'Locuință & Facturi': 'home',
  'Sănătate & Îngrijire': 'health',
  Cumpărături: 'shopping',
  'Familie & Educație': 'family',
  Divertisment: 'fun',
  Financiar: 'finance',
  Altele: 'other',
};

/**
 * The raw custom property, for the places a Tailwind utility cannot reach:
 * SVG gradient stops, `color-mix()` expressions, inline `style` on a segment
 * whose colour is chosen at runtime.
 */
export const CATEGORY_VAR: Record<Category, string> = {
  'Mâncare & Băutură': 'var(--cat-food)',
  Transport: 'var(--cat-transport)',
  'Locuință & Facturi': 'var(--cat-home)',
  'Sănătate & Îngrijire': 'var(--cat-health)',
  Cumpărături: 'var(--cat-shopping)',
  'Familie & Educație': 'var(--cat-family)',
  Divertisment: 'var(--cat-fun)',
  Financiar: 'var(--cat-finance)',
  Altele: 'var(--cat-other)',
};

/**
 * Solid fill, for bars and dots. Spelled out rather than built from
 * CATEGORY_TOKEN at runtime: Tailwind scans source text for complete class
 * names, so an interpolated `bg-cat-${token}` would never be generated.
 */
export const CATEGORY_BAR_CLASS: Record<Category, string> = {
  'Mâncare & Băutură': 'bg-cat-food',
  Transport: 'bg-cat-transport',
  'Locuință & Facturi': 'bg-cat-home',
  'Sănătate & Îngrijire': 'bg-cat-health',
  Cumpărături: 'bg-cat-shopping',
  'Familie & Educație': 'bg-cat-family',
  Divertisment: 'bg-cat-fun',
  Financiar: 'bg-cat-finance',
  Altele: 'bg-cat-other',
};

/** Small colour chip used to identify a category in lists and legends. */
export const CATEGORY_DOT_CLASS = CATEGORY_BAR_CLASS;

/** SVG fill equivalents, for sparklines and chart marks. */
export const CATEGORY_FILL_CLASS: Record<Category, string> = {
  'Mâncare & Băutură': 'fill-cat-food',
  Transport: 'fill-cat-transport',
  'Locuință & Facturi': 'fill-cat-home',
  'Sănătate & Îngrijire': 'fill-cat-health',
  Cumpărături: 'fill-cat-shopping',
  'Familie & Educație': 'fill-cat-family',
  Divertisment: 'fill-cat-fun',
  Financiar: 'fill-cat-finance',
  Altele: 'fill-cat-other',
};

/**
 * Tinted background + readable text, for badges and tiles. The text uses the
 * `-ink` step rather than the mark colour: the mark hues are tuned to sit on a
 * surface as a *shape*, and several of them (yellow at 2.2:1, pink at 2.7:1)
 * are unreadable as letters.
 */
export const CATEGORY_BADGE_CLASS: Record<Category, string> = {
  'Mâncare & Băutură': 'bg-cat-food/12 text-cat-food-ink',
  Transport: 'bg-cat-transport/12 text-cat-transport-ink',
  'Locuință & Facturi': 'bg-cat-home/12 text-cat-home-ink',
  'Sănătate & Îngrijire': 'bg-cat-health/14 text-cat-health-ink',
  Cumpărături: 'bg-cat-shopping/14 text-cat-shopping-ink',
  'Familie & Educație': 'bg-cat-family/12 text-cat-family-ink',
  Divertisment: 'bg-cat-fun/12 text-cat-fun-ink',
  Financiar: 'bg-cat-finance/12 text-cat-finance-ink',
  Altele: 'bg-cat-other/15 text-cat-other-ink',
};

export function isCategory(value: string | null): value is Category {
  return (CATEGORIES as readonly string[]).includes(value ?? '');
}

export function isSubcategoryOf(category: Category, value: string | null): boolean {
  if (!value) return false;
  return (SUBCATEGORIES[category] as readonly string[]).includes(value);
}

export interface CategoryOption {
  category: Category;
  subcategory: string | null;
}

/** Flattened (category, subcategory) pairs, plus one "no subcategory" entry
 * per main category — used to build the searchable category picker. */
export const ALL_CATEGORY_OPTIONS: CategoryOption[] = CATEGORIES.flatMap((category) => [
  { category, subcategory: null },
  ...SUBCATEGORIES[category].map((subcategory) => ({ category, subcategory })),
]);
