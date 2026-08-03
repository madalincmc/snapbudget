import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';
import { updateReceipt } from './actions';

const inputClass =
  'h-11 rounded-lg border border-black/[.08] bg-white px-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white';

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: receipt } = await supabase
    .from('receipts')
    .select('id, merchant, amount, purchase_date, category, storage_path')
    .eq('id', id)
    .single();

  if (!receipt) {
    notFound();
  }

  const { data: signedUrlData } = receipt.storage_path
    ? await supabase.storage.from('receipts').createSignedUrl(receipt.storage_path, 600)
    : { data: null };

  const updateReceiptWithId = updateReceipt.bind(null, id);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          ← Înapoi la dashboard
        </Link>

        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Detalii bon</h1>

        {signedUrlData?.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signedUrlData.signedUrl}
            alt="Bon"
            className="max-h-80 w-full rounded-lg bg-white object-contain dark:bg-zinc-900"
          />
        )}

        <form action={updateReceiptWithId} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Comerciant</span>
            <input name="merchant" defaultValue={receipt.merchant ?? ''} className={inputClass} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Sumă (lei)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              defaultValue={receipt.amount ?? ''}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Data cumpărării</span>
            <input
              type="date"
              name="purchase_date"
              defaultValue={receipt.purchase_date ?? ''}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Categorie</span>
            <select
              name="category"
              defaultValue={receipt.category ?? 'Altele'}
              className={inputClass}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
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
