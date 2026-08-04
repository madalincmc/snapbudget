import { redirect } from 'next/navigation';
import Link from 'next/link';
import { History, LogOut, Plus, Receipt, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  buildDashboardData,
  dashboardRangeStart,
  toDateString,
  type ReceiptRow,
} from '@/lib/dashboard/aggregate';
import { getHouseholdMembership, type HouseholdMemberInfo } from '@/lib/household/membership';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { MonthComparisonCard } from '@/components/month-comparison-card';
import { TrendInsightCards } from '@/components/trend-insight-cards';
import { SpendingTrendChart } from '@/components/spending-trend-chart';
import { ReceiptsList } from '@/components/receipts-list';
import { HouseholdFilter } from '@/components/household-filter';
import { PendingInvitationsBanner } from '@/components/pending-invitations-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { signOut } from './actions';

const RECEIPT_COLUMNS =
  'id, user_id, merchant, amount, purchase_date, category, subcategory, status, source, created_at';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { who } = await searchParams;

  const membership = await getHouseholdMembership(supabase, user.id);

  let members: HouseholdMemberInfo[] = [];
  const creators: Record<string, { displayName: string | null }> = {};
  let pendingInvitations: { id: string; householdName: string }[] = [];

  if (membership) {
    const { data } = await supabase
      .from('household_members')
      .select('user_id, display_name, avatar_url')
      .eq('household_id', membership.householdId);

    members = (data ?? []).map((m) => ({
      userId: m.user_id,
      displayName: m.display_name,
      avatarUrl: m.avatar_url,
    }));
    for (const m of members) {
      creators[m.userId] = { displayName: m.displayName };
    }
  } else if (user.email) {
    const { data } = await supabase
      .from('household_invitations')
      .select('id, households(name)')
      .eq('status', 'pending')
      .ilike('email', user.email);

    pendingInvitations = (data ?? [])
      .filter((inv) => inv.households)
      .map((inv) => ({
        id: inv.id,
        householdName: (inv.households as unknown as { name: string }).name,
      }));
  }

  // Only "all" (no filter beyond RLS), "me", or a real co-member id are valid —
  // anything else falls back to "all" rather than silently no-op filtering.
  const validWho =
    who === 'me' || (who && members.some((m) => m.userId === who)) ? who : null;

  const now = new Date();
  const rangeStart = dashboardRangeStart(now);
  const rangeStartDateStr = toDateString(rangeStart);
  const rangeStartISO = rangeStart.toISOString();

  // Covers the previous month + last 30 days, needed for the comparison card
  // and trend chart. Manual/backdated entries without a purchase_date yet
  // fall back to created_at, matching how buildDashboardData buckets them.
  let rangeQuery = supabase
    .from('receipts')
    .select(RECEIPT_COLUMNS)
    .eq('status', 'processed')
    .or(
      `purchase_date.gte.${rangeStartDateStr},and(purchase_date.is.null,created_at.gte.${rangeStartISO})`,
    )
    .limit(5000);
  let latestQuery = supabase
    .from('receipts')
    .select(RECEIPT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(10);

  const targetUserId = validWho === 'me' ? user.id : validWho;
  if (targetUserId) {
    rangeQuery = rangeQuery.eq('user_id', targetUserId);
    latestQuery = latestQuery.eq('user_id', targetUserId);
  }

  const [{ data: rangeReceipts }, { data: latestReceipts }] = await Promise.all([
    rangeQuery,
    latestQuery,
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
            <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/household" />}>
              <Users />
              <span className="sr-only">Gospodărie</span>
            </Button>
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

        <PendingInvitationsBanner invitations={pendingInvitations} />

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

        {members.length > 1 && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground text-xs">Cheltuieli:</span>
            <HouseholdFilter members={members} meUserId={user.id} />
          </div>
        )}

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
            <ReceiptsList receipts={latest} meUserId={user.id} creators={creators} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
