import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ReceiptUploadForm } from '@/components/receipt-upload-form';

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 dark:bg-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Adaugă bon
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Fotografiază bonul sau alege o poză din galerie.
        </p>
      </div>
      <ReceiptUploadForm userId={user.id} />
      <Link
        href="/dashboard"
        className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
      >
        Înapoi la dashboard
      </Link>
    </div>
  );
}
