import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { delay } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ManualExpenseFields } from '@/components/manual-expense-fields';
import { createManualExpense } from './actions';

export default async function NewExpensePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-1 justify-center px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <PageHeader
          title="Adaugă cheltuială manuală"
          description="Pentru cheltuieli fără bon: cash, parcare, transport"
        />

        <form
          action={createManualExpense}
          className="sb-rise flex flex-col gap-4"
          style={delay(60)}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Sumă (lei) — obligatoriu</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              required
              autoFocus
            />
          </div>

          {/* Merchant and category are one unit now — the first proposes the
              second — so they are rendered together and ahead of the date. */}
          <ManualExpenseFields />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchase_date">Data — obligatoriu</Label>
            <Input
              id="purchase_date"
              type="date"
              name="purchase_date"
              required
              defaultValue={today}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notițe (opțional)</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="ex: plătit cash" />
          </div>

          <Button type="submit" size="lg" className="mt-2 h-12 rounded-full">
            Salvează
          </Button>
        </form>
      </div>
    </div>
  );
}
