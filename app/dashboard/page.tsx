import { redirect } from 'next/navigation';
import Link from 'next/link';
import { History, LogOut, Plus, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  buildDashboardData,
  dashboardRangeStart,
  toDateString,
  type ReceiptRow,
} from '@/lib/dashboard/aggregate';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { MonthComparisonCard } from '@/components/month-comparison-card';
import { TrendInsightCards } from '@/components/trend-insight-cards';
import { SpendingTrendChart } from '@/components/spending-trend-chart';
import { ReceiptsList } from '@/components/receipts-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { signOut } from './actions';

const RECEIPT_COLUMNS =
  'id, merchant, amount, purchase_date, category, subcategory, status, source, created_at';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const now = new Date();
  const rangeStart = dashboardRangeStart(now);
  const rangeStartDateStr = toDateString(rangeStart);
  const rangeStartISO = rangeStart.toISOString();

  // Covers the previous month + last 30 days, needed for the comparison card
  // and trend chart. Manual/backdated entries without a purchase_date yet
  // fall back to created_at, matching how buildDashboardData buckets them.
  const [{ data: rangeReceipts }, { data: latestReceipts }] = await Promise.all([
    supabase
      .from('receipts')
      .select(RECEIPT_COLUMNS)
      .eq('status', 'processed')
      .or(
        `purchase_date.gte.${rangeStartDateStr},and(purchase_date.is.null,created_at.gte.${rangeStartISO})`,
      )
      .limit(5000),
    supabase.from('receipts').select(RECEIPT_COLUMNS).order('created_at', { ascending: false }).limit(10),
  ]);

  const {
    categoryTotals,
    comparison,
    topCategory,
    biggestExpense,
    avgDailySpend,
    highestSpendingDay,
    dailyTrend,
  } = buildDashboardData((rangeReceipts ?? []) as ReceiptRow[], now);
  const latest = (latestReceipts ?? []) as ReceiptRow[];

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
            <MonthComparisonCard comparison={comparison} />
          </CardHeader>
        </Card>

        <TrendInsightCards
          topCategory={topCategory}
          biggestExpense={biggestExpense}
          avgDailySpend={avgDailySpend}
          highestSpendingDay={highestSpendingDay}
        />

        <Card>
          <CardContent>
            <SpendingTrendChart data={dailyTrend} />
          </CardContent>
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
