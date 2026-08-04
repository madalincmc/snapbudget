import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RecurringForm } from '@/components/recurring-form';
import { Button } from '@/components/ui/button';
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
    <div className="bg-muted/40 flex flex-1 justify-center px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <Button
          variant="link"
          className="self-start px-0"
          nativeButton={false}
          render={<Link href="/recurring" />}
        >
          <ArrowLeft />
          Înapoi
        </Button>

        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-xl font-semibold">Adaugă cheltuială recurentă</h1>
          <p className="text-muted-foreground text-sm">
            Se adaugă automat la fiecare scadență, ca o cheltuială obișnuită.
          </p>
        </div>

        <RecurringForm action={createRecurring} submitLabel="Salvează" />
      </div>
    </div>
  );
}
