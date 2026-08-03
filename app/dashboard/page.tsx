import { redirect } from 'next/navigation';
import Link from 'next/link';
import { History, LogOut, Plus, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buildDashboardData, type ReceiptRow } from '@/lib/dashboard/aggregate';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { ReceiptsList } from '@/components/receipts-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    .select(
      'id, merchant, amount, purchase_date, category, subcategory, status, source, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500);

  const { monthTotal, categoryTotals, latest } = buildDashboardData(
    (receipts ?? []) as ReceiptRow[],
  );

  return (
    <div className="bg-muted/40 flex flex-1 justify-center px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Salut,</p>
            <h1 className="text-foreground text-xl font-semibold">
              {user.user_metadata.full_name ?? user.email}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<Link href="/history" />}
            >
              <History />
              <span className="sr-only">Istoric</span>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                <LogOut />
                Deconectare
              </Button>
            </form>
          </div>
        </header>

        <div className="flex gap-3">
          <Button
            size="lg"
            className="h-12 flex-1 rounded-full"
            nativeButton={false}
            render={<Link href="/receipts/new" />}
          >
            <Receipt />
            Adaugă bon
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 flex-1 rounded-full"
            nativeButton={false}
            render={<Link href="/expenses/new" />}
          >
            <Plus />
            Cheltuială manuală
          </Button>
        </div>

        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-sm">Total cheltuit luna aceasta</p>
            <p className="text-foreground text-4xl font-semibold tabular-nums">
              {monthTotal.toFixed(2)} lei
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardContent>
            <CategoryBreakdown categoryTotals={categoryTotals} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <ReceiptsList receipts={latest} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
