/**
 * Main categories drive dashboard charts and OCR categorization.
 * Subcategories are optional, finer-grained detail shown in lists/detail
 * views only — never charted separately (see MAD-60).
 */
export const CATEGORIES = [
  'Mâncare & Băutură',
  'Transport',
  'Casă',
  'Sănătate',
  'Cumpărături',
  'Familie',
  'Divertisment',
  'Financiar',
  'Altele',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SUBCATEGORIES: Record<Category, readonly string[]> = {
  'Mâncare & Băutură': ['Alimente', 'Restaurante', 'Cafea & Gustări', 'Livrare mâncare'],
  Transport: ['Combustibil', 'Transport public', 'Parcare & Taxe drum', 'Întreținere auto'],
  Casă: ['Utilități', 'Chirie / Rată', 'Mobilă & Electrocasnice', 'Renovări'],
  Sănătate: ['Farmacie', 'Medical', 'Fitness'],
  Cumpărături: ['Îmbrăcăminte', 'Electronice', 'Cumpărături generale'],
  Familie: ['Copii', 'Educație', 'Animale de companie'],
  Divertisment: ['Abonamente', 'Filme & Jocuri', 'Călătorii & Timp liber'],
  Financiar: ['Comisioane bancare', 'Asigurări', 'Taxe'],
  Altele: ['Retragere numerar', 'Cadouri', 'Neclasificat'],
};

/** Solid bar fill, for the dashboard's category-breakdown chart. */
export const CATEGORY_BAR_CLASS: Record<Category, string> = {
  'Mâncare & Băutură': 'bg-[#2a78d6] dark:bg-[#3987e5]',
  Transport: 'bg-[#eb6834] dark:bg-[#d95926]',
  Casă: 'bg-[#1baf7a] dark:bg-[#199e70]',
  Sănătate: 'bg-[#eda100] dark:bg-[#c98500]',
  Cumpărături: 'bg-[#e87ba4] dark:bg-[#d55181]',
  Familie: 'bg-[#008300] dark:bg-[#008300]',
  Divertisment: 'bg-[#4a3aa7] dark:bg-[#9085e9]',
  Financiar: 'bg-[#e34948] dark:bg-[#e66767]',
  // "Altele" is a residual/catch-all bucket, not a real spending identity —
  // it deliberately gets a neutral tint rather than the next hue in line.
  Altele: 'bg-zinc-400 dark:bg-zinc-500',
};

/**
 * SVG fill equivalents of CATEGORY_BAR_CLASS, for the sparklines in the
 * category trends. Spelled out rather than derived from the bar classes at
 * runtime: Tailwind scans source text for complete class names, so a string
 * built by replacing "bg-" with "fill-" would never be generated.
 */
export const CATEGORY_FILL_CLASS: Record<Category, string> = {
  'Mâncare & Băutură': 'fill-[#2a78d6] dark:fill-[#3987e5]',
  Transport: 'fill-[#eb6834] dark:fill-[#d95926]',
  Casă: 'fill-[#1baf7a] dark:fill-[#199e70]',
  Sănătate: 'fill-[#eda100] dark:fill-[#c98500]',
  Cumpărături: 'fill-[#e87ba4] dark:fill-[#d55181]',
  Familie: 'fill-[#008300] dark:fill-[#008300]',
  Divertisment: 'fill-[#4a3aa7] dark:fill-[#9085e9]',
  Financiar: 'fill-[#e34948] dark:fill-[#e66767]',
  Altele: 'fill-zinc-400 dark:fill-zinc-500',
};

/** Tinted background + matching text, for badges/pills (vs. the solid bars above). */
export const CATEGORY_BADGE_CLASS: Record<Category, string> = {
  'Mâncare & Băutură': 'bg-[#2a78d6]/10 text-[#2a78d6] dark:bg-[#3987e5]/15 dark:text-[#3987e5]',
  Transport: 'bg-[#eb6834]/10 text-[#eb6834] dark:bg-[#d95926]/15 dark:text-[#d95926]',
  Casă: 'bg-[#1baf7a]/10 text-[#1baf7a] dark:bg-[#199e70]/15 dark:text-[#199e70]',
  Sănătate: 'bg-[#eda100]/10 text-[#a3720a] dark:bg-[#c98500]/15 dark:text-[#c98500]',
  Cumpărături: 'bg-[#e87ba4]/10 text-[#e87ba4] dark:bg-[#d55181]/15 dark:text-[#d55181]',
  Familie: 'bg-[#008300]/10 text-[#006300] dark:bg-[#008300]/15 dark:text-[#0ca30c]',
  Divertisment: 'bg-[#4a3aa7]/10 text-[#4a3aa7] dark:bg-[#9085e9]/15 dark:text-[#9085e9]',
  Financiar: 'bg-[#e34948]/10 text-[#e34948] dark:bg-[#e66767]/15 dark:text-[#e66767]',
  Altele: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
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
