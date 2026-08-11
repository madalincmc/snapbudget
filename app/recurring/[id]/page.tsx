import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { delay } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { RecurringForm } from '@/components/recurring-form';
import { formatListDate } from '@/lib/dashboard/format';
import type { RecurringExpense } from '@/lib/recurring';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { updateRecurring, deleteRecurring } from '../actions';

export default async function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('recurring_expenses')
    .select(
      'id, title, amount, category, subcategory, frequency, start_date, next_due_date, paused, notes',
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const rule = data as RecurringExpense;
  const updateWithId = updateRecurring.bind(null, id);

  return (
    <div className="flex flex-1 justify-center px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <PageHeader
          title="Editează recurenta"
          description={`${
            rule.paused
              ? 'Regula e pe pauză.'
              : `Următoarea scadență: ${formatListDate(rule.next_due_date)}.`
          } Modificările se aplică doar ocurențelor viitoare.`}
          backHref="/recurring"
        />

        <div className="sb-rise" style={delay(60)}>
          <RecurringForm
            action={updateWithId}
            existing={rule}
            submitLabel="Salvează modificările"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="ghost" className="text-destructive self-start">
                <Trash2 />
                Șterge regula
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ștergi „{rule.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                Nu se mai generează cheltuieli noi. Cele deja adăugate rămân în istoric.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <form action={deleteRecurring.bind(null, id)}>
                <AlertDialogAction type="submit" variant="destructive">
                  Șterge
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
