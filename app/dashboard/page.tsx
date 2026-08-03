import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { buildDashboardData, type ReceiptRow } from '@/lib/dashboard/aggregate';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { ReceiptsList } from '@/components/receipts-list';
import { signOut } from './actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: receipts } = await supabase
    .from('receipts')
    .select('id, merchant, amount, purchase_date, category, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  const { monthTotal, categoryTotals, latest } = buildDashboardData(
    (receipts ?? []) as ReceiptRow[],
  );

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-lg flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Salut,</p>
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              {user.user_metadata.full_name ?? user.email}
            </h1>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="h-10 rounded-full border border-black/[.08] px-4 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-white dark:hover:bg-[#1a1a1a]"
            >
              Deconectare
            </button>
          </form>
        </header>

        <Link
          href="/receipts/new"
          className="bg-foreground text-background flex h-12 items-center justify-center rounded-full px-6 font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Adaugă bon
        </Link>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Total cheltuit luna aceasta</p>
          <p className="text-4xl font-semibold text-black tabular-nums dark:text-zinc-50">
            {monthTotal.toFixed(2)} lei
          </p>
        </div>

        <CategoryBreakdown categoryTotals={categoryTotals} />

        <ReceiptsList receipts={latest} />
      </div>
    </div>
  );
}
