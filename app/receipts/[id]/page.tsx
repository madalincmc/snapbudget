import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isCategory } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryPicker } from '@/components/category-picker';
import { returnPathFor } from '@/lib/receipts/return-path';
import { updateReceipt } from './actions';

export default async function ReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const backHref = returnPathFor(from);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: receipt } = await supabase
    .from('receipts')
    .select('id, merchant, amount, purchase_date, category, subcategory, storage_path')
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
    <div className="flex flex-1 justify-center px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Button
          variant="link"
          className="self-start px-0"
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          <ArrowLeft />
          {backHref === '/history' ? 'Înapoi la istoric' : 'Înapoi la dashboard'}
        </Button>

        <h1 className="text-foreground text-xl font-semibold">Detalii bon</h1>

        {signedUrlData?.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signedUrlData.signedUrl}
            alt="Bon"
            className="bg-card max-h-80 w-full rounded-lg object-contain"
          />
        )}

        <form action={updateReceiptWithId} className="flex flex-col gap-4">
          <input type="hidden" name="from" value={from ?? ''} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="merchant">Comerciant</Label>
            <Input id="merchant" name="merchant" defaultValue={receipt.merchant ?? ''} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Sumă (lei)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              name="amount"
              defaultValue={receipt.amount ?? ''}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchase_date">Data cumpărării</Label>
            <Input
              id="purchase_date"
              type="date"
              name="purchase_date"
              defaultValue={receipt.purchase_date ?? ''}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categorie</Label>
            <CategoryPicker
              defaultCategory={isCategory(receipt.category) ? receipt.category : 'Altele'}
              defaultSubcategory={receipt.subcategory}
            />
          </div>

          <Button type="submit" size="lg" className="mt-2 h-12 rounded-full">
            Salvează
          </Button>
        </form>
      </div>
    </div>
  );
}
