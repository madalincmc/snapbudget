import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { delay } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { RecurringForm } from '@/components/recurring-form';
import { createRecurring } from '../actions';

export default async function NewRecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <PageHeader
          title="Adaugă cheltuială recurentă"
          description="Se adaugă automat la fiecare scadență, ca o cheltuială obișnuită"
          backHref="/recurring"
        />

        <div className="sb-rise" style={delay(60)}>
          <RecurringForm action={createRecurring} submitLabel="Salvează" />
        </div>
      </div>
    </div>
  );
}
