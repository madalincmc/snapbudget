import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';
import { createManualExpense } from './actions';

const inputClass =
  'h-11 rounded-lg border border-black/[.08] bg-white px-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white';

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
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          ← Înapoi la dashboard
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Adaugă cheltuială manuală
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pentru cheltuieli fără bon: cash, parcare, transport, etc.
          </p>
        </div>

        <form action={createManualExpense} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Sumă (lei) *</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              required
              autoFocus
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Categorie *</span>
            <select name="category" required defaultValue="Altele" className={inputClass}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Data *</span>
            <input
              type="date"
              name="purchase_date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Comerciant / titlu</span>
            <input name="merchant" placeholder="opțional" className={inputClass} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Notițe</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="opțional"
              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white"
            />
          </label>

          <button
            type="submit"
            className="bg-foreground text-background mt-2 h-12 rounded-full font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Salvează
          </button>
        </form>
      </div>
    </div>
  );
}
