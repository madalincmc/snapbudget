export const FREQUENCIES = ['monthly', 'weekly', 'yearly'] as const;

export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  monthly: 'Lunar',
  weekly: 'Săptămânal',
  yearly: 'Anual',
};

export function isFrequency(value: string | null): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value ?? '');
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  subcategory: string | null;
  frequency: Frequency;
  start_date: string;
  next_due_date: string;
  paused: boolean;
  notes: string | null;
}
