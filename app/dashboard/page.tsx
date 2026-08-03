import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from './actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Salut, {user.user_metadata.full_name ?? user.email}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Dashboard-ul cu cheltuieli vine în curând.
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="h-10 rounded-full border border-black/[.08] px-5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-white dark:hover:bg-[#1a1a1a]"
        >
          Deconectare
        </button>
      </form>
    </div>
  );
}
