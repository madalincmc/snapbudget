import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  buildDashboardData,
  dashboardRange,
  isMonthKey,
  monthKeyOf,
  type ReceiptRow,
} from '@/lib/dashboard/aggregate';
import { expensesBetween, RECEIPT_COLUMNS } from '@/lib/dashboard/query';
import { getHouseholdMembership, type HouseholdMemberInfo } from '@/lib/household/membership';
import {
  buildBudgetOverview,
  parseBudgetRow,
  scopeForView,
  type Budget,
  type BudgetRow,
} from '@/lib/budgets';
import { MonthPicker } from '@/components/month-picker';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { MonthHeroCard } from '@/components/month-hero-card';
import { TrendInsightCards } from '@/components/trend-insight-cards';
import { SpendingTrendChart } from '@/components/spending-trend-chart';
import { ReceiptsList } from '@/components/receipts-list';
import { HouseholdFilter } from '@/components/household-filter';
import { PendingInvitationsBanner } from '@/components/pending-invitations-banner';
import { DashboardEmptyState } from '@/components/dashboard-empty-state';
import { QuickLinksCard, type RecurringSummary } from '@/components/quick-links-card';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { signOut } from './actions';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { who, month: monthParam } = await searchParams;

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
  const validWho = who === 'me' || (who && members.some((m) => m.userId === who)) ? who : null;

  const now = new Date();
  const currentMonth = monthKeyOf(now);

  // A malformed or future month falls back to the current one rather than
  // rendering an empty dashboard for a period that cannot have data.
  const month = isMonthKey(monthParam) && monthParam <= currentMonth ? monthParam : currentMonth;
  const isCurrentMonth = month === currentMonth;

  // The selected month, the one before it for the comparison card, and — on the
  // live month — the trailing 30 days the chart needs.
  const { from, to } = dashboardRange(month, now);

  let rangeQuery = expensesBetween(supabase, from, to);
  let latestQuery = supabase
    .from('receipts')
    .select(RECEIPT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(5);

  const targetUserId = validWho === 'me' ? user.id : validWho;
  if (targetUserId) {
    rangeQuery = rangeQuery.eq('user_id', targetUserId);
    latestQuery = latestQuery.eq('user_id', targetUserId);
  }

  // Counts rows without fetching them — distinguishes "brand new account" from
  // "nothing this month", which otherwise look identical (all zeros).
  const totalCountQuery = supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  // Active rules only, soonest first — the card shows what is coming next.
  const recurringQuery = supabase
    .from('recurring_expenses')
    .select('title, amount, next_due_date', { count: 'exact' })
    .eq('paused', false)
    .order('next_due_date', { ascending: true })
    .limit(1);

  // Budgets follow the current view rather than carrying their own switch:
  // "Toate" compares against the household budget, "Eu" against the personal
  // one. Viewing another member shows no budget — theirs is not yours to see,
  // and yours does not describe their total.
  //
  // Past months show none either. A budget row holds today's limit with no
  // history behind it, so measuring July against it would compare spending to
  // a number that may not have existed in July (see MAD-69, out of scope).
  const budgetScope = isCurrentMonth ? scopeForView(membership !== null, validWho ?? null) : null;

  // PromiseLike, not Promise: Supabase's query builder is a thenable, and
  // `.then()` on it keeps that type rather than widening to a real Promise.
  const budgetRowsPromise: PromiseLike<BudgetRow[]> =
    budgetScope === null
      ? Promise.resolve([])
      : (budgetScope === 'household'
          ? supabase
              .from('budgets')
              .select('id, household_id, category, amount')
              .eq('household_id', membership!.householdId)
          : supabase
              .from('budgets')
              .select('id, household_id, category, amount')
              .is('household_id', null)
              .eq('user_id', user.id)
        ).then(({ data }) => (data ?? []) as BudgetRow[]);

  const [
    { data: rangeReceipts },
    { data: latestReceipts },
    { count: totalReceipts },
    { data: nextRecurring, count: activeRecurringCount },
    budgetRows,
  ] = await Promise.all([
    rangeQuery,
    latestQuery,
    totalCountQuery,
    recurringQuery,
    budgetRowsPromise,
  ]);

  const recurringSummary: RecurringSummary = {
    activeCount: activeRecurringCount ?? 0,
    next: nextRecurring?.[0]
      ? {
          title: nextRecurring[0].title,
          amount: Number(nextRecurring[0].amount),
          nextDueDate: nextRecurring[0].next_due_date,
        }
      : null,
  };

  const {
    monthTotal,
    categoryTotals,
    comparison,
    topCategory,
    biggestExpense,
    avgDailySpend,
    dailyTrend,
  } = buildDashboardData((rangeReceipts ?? []) as ReceiptRow[], month, now);
  const latest = (latestReceipts ?? []) as ReceiptRow[];
  const hasAnyExpense = (totalReceipts ?? 0) > 0;

  const budgets = budgetRows.map(parseBudgetRow).filter((b): b is Budget => b !== null);
  const budgetOverview = buildBudgetOverview(budgets, monthTotal, categoryTotals, now);

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      {/* gap-5 between sections, tighter inside them: the page had one uniform
          gap everywhere, so eleven cards read as eleven equals. */}
      <div className="flex w-full max-w-lg flex-col gap-5">
        {/* Identity and period controls share one row. The greeting had a full
            row of its own above a second row for the filter, which spent the
            top of a phone screen on chrome before any number appeared. */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-muted-foreground text-xs">Salut,</span>
            <h1 className="text-foreground truncate text-base leading-tight font-semibold">
              {user.user_metadata.full_name?.split(' ')[0] ?? user.email}
            </h1>
          </div>

          <div className="flex flex-none items-center gap-1">
            {hasAnyExpense && members.length > 1 && (
              <HouseholdFilter members={members} meUserId={user.id} />
            )}
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-muted-foreground/70 hover:text-foreground"
              >
                <LogOut />
                <span className="sr-only">Deconectare</span>
              </Button>
            </form>
          </div>
        </header>

        <PendingInvitationsBanner invitations={pendingInvitations} />

        {!hasAnyExpense ? (
          <DashboardEmptyState />
        ) : (
          <>
            <div className="-mt-1 flex justify-center">
              <MonthPicker month={month} currentMonth={currentMonth} />
            </div>

            {/* The number, and whether it is a problem — one card. */}
            <Card className="[--card-spacing:--spacing(5)]">
              <CardContent>
                <MonthHeroCard
                  comparison={comparison}
                  avgDailySpend={avgDailySpend}
                  month={month}
                  isCurrentMonth={isCurrentMonth}
                  budget={budgetScope ? budgetOverview.overall : null}
                />
              </CardContent>
            </Card>

            <TrendInsightCards topCategory={topCategory} biggestExpense={biggestExpense} />

            <Card>
              <CardContent>
                <CategoryBreakdown
                  categoryTotals={categoryTotals}
                  budgets={budgetOverview.byCategory}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <SpendingTrendChart
                  data={dailyTrend}
                  month={month}
                  isCurrentMonth={isCurrentMonth}
                />
              </CardContent>
            </Card>

            {/* Recent activity describes now, not the month being browsed. */}
            {isCurrentMonth && (
              <Card>
                <CardContent>
                  <ReceiptsList receipts={latest} meUserId={user.id} creators={creators} />
                </CardContent>
              </Card>
            )}

            {isCurrentMonth && (
              <QuickLinksCard recurring={recurringSummary} budgetCount={budgets.length} />
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
