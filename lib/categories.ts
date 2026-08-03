export const CATEGORIES = ['Mâncare', 'Transport', 'Casă', 'Electronice', 'Altele'] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_BAR_CLASS: Record<Category, string> = {
  Mâncare: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  Transport: 'bg-[#eb6834] dark:bg-[#d95926]',
  Casă: 'bg-[#1baf7a] dark:bg-[#199e70]',
  Electronice: 'bg-[#eda100] dark:bg-[#c98500]',
  Altele: 'bg-[#e87ba4] dark:bg-[#d55181]',
};

export function isCategory(value: string | null): value is Category {
  return (CATEGORIES as readonly string[]).includes(value ?? '');
}
