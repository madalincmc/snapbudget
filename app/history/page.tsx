import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HistoryList } from '@/components/history-list';

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Istoric bonuri</h1>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
          >
            ← Dashboard
          </Link>
        </div>

        <HistoryList />
      </div>
    </div>
  );
}
