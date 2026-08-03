export const CATEGORIES = ['Mâncare', 'Transport', 'Casă', 'Electronice', 'Altele'] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_BAR_CLASS: Record<Category, string> = {
  Mâncare: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  Transport: 'bg-[#eb6834] dark:bg-[#d95926]',
  Casă: 'bg-[#1baf7a] dark:bg-[#199e70]',
  Electronice: 'bg-[#eda100] dark:bg-[#c98500]',
  Altele: 'bg-[#e87ba4] dark:bg-[#d55181]',
};

/** Tinted background + matching text, for badges/pills (vs. the solid bars above). */
export const CATEGORY_BADGE_CLASS: Record<Category, string> = {
  Mâncare: 'bg-[#2a78d6]/10 text-[#2a78d6] dark:bg-[#3987e5]/15 dark:text-[#3987e5]',
  Transport: 'bg-[#eb6834]/10 text-[#eb6834] dark:bg-[#d95926]/15 dark:text-[#d95926]',
  Casă: 'bg-[#1baf7a]/10 text-[#1baf7a] dark:bg-[#199e70]/15 dark:text-[#199e70]',
  Electronice: 'bg-[#eda100]/10 text-[#a3720a] dark:bg-[#c98500]/15 dark:text-[#c98500]',
  Altele: 'bg-[#e87ba4]/10 text-[#e87ba4] dark:bg-[#d55181]/15 dark:text-[#d55181]',
};

export function isCategory(value: string | null): value is Category {
  return (CATEGORIES as readonly string[]).includes(value ?? '');
}
