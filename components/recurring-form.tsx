import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategoryPicker } from '@/components/category-picker';
import { FrequencyPicker } from '@/components/frequency-picker';
import { isCategory, type Category } from '@/lib/categories';
import type { Frequency, RecurringExpense } from '@/lib/recurring';

export function RecurringForm({
  action,
  existing,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  existing?: RecurringExpense;
  submitLabel: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultCategory: Category = isCategory(existing?.category ?? null)
    ? (existing!.category as Category)
    : 'Casă';

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Titlu — obligatoriu</Label>
        <Input
          id="title"
          name="title"
          placeholder="ex: Chirie, Netflix, Asigurare"
          defaultValue={existing?.title ?? ''}
          required
          autoFocus={!existing}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Sumă (lei) — obligatoriu</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          name="amount"
          defaultValue={existing?.amount ?? ''}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Frecvență — obligatoriu</Label>
        <FrequencyPicker defaultValue={(existing?.frequency as Frequency) ?? 'monthly'} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="start_date">Prima dată — obligatoriu</Label>
        <Input
          id="start_date"
          type="date"
          name="start_date"
          defaultValue={existing?.start_date ?? today}
          required
        />
        <p className="text-muted-foreground text-xs">
          O dată din trecut arată de când există cheltuiala. Nu se generează retroactiv — prima
          cheltuială apare la următoarea scadență.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Categorie — obligatoriu</Label>
        <CategoryPicker
          defaultCategory={defaultCategory}
          defaultSubcategory={existing?.subcategory ?? null}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notițe (opțional)</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={existing?.notes ?? ''} />
      </div>

      <Button type="submit" size="lg" className="mt-2 h-12 rounded-full">
        {submitLabel}
      </Button>
    </form>
  );
}
