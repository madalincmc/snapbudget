import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  isSpent,
  monthKeyOf,
  receiptCategory,
  receiptDay,
  trendOverDays,
  type ReceiptRow,
} from '@/lib/dashboard/aggregate';
import { periodFetchRange, periodFromParams } from '@/lib/dashboard/period';
import { expensesBetween } from '@/lib/dashboard/query';
import { categoryPath, dashboardPath } from '@/lib/dashboard/links';
import { getHouseholdMembership, type HouseholdMemberInfo } from '@/lib/household/membership';
import { categoryFromToken, CATEGORY_BAR_CLASS } from '@/lib/categories';
import { money, periodLabel } from '@/lib/dashboard/format';
import { PeriodPicker } from '@/components/period-picker';
import { PageHeader } from '@/components/page-header';
import { SpendingTrendChart } from '@/components/spending-trend-chart';
import { ReceiptsList } from '@/components/receipts-list';
import { BottomNav } from '@/components/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';
import { cn, delay } from '@/lib/utils';

/**
 * One category, one month: what was spent on it, day by day, and every expense
 * behind the number.
 *
 * Reached by tapping a row in the dashboard's breakdown, and scoped by the same
 * two params that screen is scoped by — so the month and the household member
 * being looked at survive the trip in both directions.
 */
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ who?: string; month?: string; from?: string; to?: string }>;
}) {
  const { token } = await params;
  const category = categoryFromToken(token);
  if (!category) {
    notFound();
  }

  const { who, month: monthParam, from: fromParam, to: toParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const membership = await getHouseholdMembership(supabase, user.id);

  let members: HouseholdMemberInfo[] = [];
  const creators: Record<string, { displayName: string | null }> = {};

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
  }

  // Same validation as the dashboard: an unknown "who" falls back to everyone
  // rather than filtering to nothing, and a malformed or future month falls
  // back to the current one.
  const validWho = who === 'me' || (who && members.some((m) => m.userId === who)) ? who : null;

  const now = new Date();
  const currentMonth = monthKeyOf(now);

  // The period the dashboard sent, resolved the same way it resolves it — this
  // screen has to be measuring the days the breakdown row was measuring, or the
  // share below would be a percentage of a different total.
  const period = periodFromParams({ month: monthParam, from: fromParam, to: toParam }, now);
  const isCurrentMonth = period.month === currentMonth;

  // The dashboard's window, not a narrower one. On the live month the chart is
  // a trailing 30 days that reaches back into the previous month, so the rows
  // behind those columns have to be fetched too.
  const { from, to } = periodFetchRange(period);

  let rangeQuery = expensesBetween(supabase, from, to);
  const targetUserId = validWho === 'me' ? user.id : validWho;
  if (targetUserId) {
    rangeQuery = rangeQuery.eq('user_id', targetUserId);
  }

  const { data } = await rangeQuery;
  const rows = ((data ?? []) as ReceiptRow[]).filter(isSpent);

  const inCategory = rows.filter((r) => receiptCategory(r) === category);
  const monthly = inCategory
    .filter((r) => receiptDay(r) >= period.from && receiptDay(r) <= period.to)
    // Newest first, and created_at breaks the tie so several expenses sharing a
    // purchase_date keep a stable order instead of the one Postgres happened to
    // return them in.
    .sort(
      (a, b) =>
        receiptDay(b).localeCompare(receiptDay(a)) || b.created_at.localeCompare(a.created_at),
    );

  const total = monthly.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const monthTotal = rows
    .filter((r) => receiptDay(r) >= period.from && receiptDay(r) <= period.to)
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const share = monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0;

  const dailyTrend = trendOverDays(inCategory, period.trendDays);

  // The current month is the default everywhere, so it stays out of the links.
  const view = {
    month: isCurrentMonth ? null : period.month,
    who: validWho,
    ...(period.kind === 'custom' ? { from: period.from, to: period.to } : {}),
  };

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <PageHeader
          title={category}
          description={`Cheltuielile din ${periodLabel(period)}`}
          backHref={dashboardPath(view)}
          backLabel="Înapoi la dashboard"
        />

        <div className="sb-fade -mt-1 flex justify-center" style={delay(40)}>
          <PeriodPicker period={period} currentMonth={currentMonth} />
        </div>

        <Card className="sb-rise [--card-spacing:--spacing(5)]" style={delay(80)}>
          <CardContent className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-2 text-xs">
              {/* The same swatch that identifies this category in the breakdown
                  the reader just tapped — it is what says they landed on the
                  row they aimed at. */}
              <span
                className={cn('h-2 w-2 flex-none rounded-full', CATEGORY_BAR_CLASS[category])}
                aria-hidden
              />
              Total {isCurrentMonth ? 'luna aceasta' : periodLabel(period)}
            </span>
            <p className="text-foreground text-3xl font-semibold tracking-tight tabular-nums">
              {money(total)}
              <span className="text-muted-foreground/70 text-base font-normal"> lei</span>
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {monthly.length === 0
                ? 'Nicio cheltuială în această categorie'
                : `${share}% din cheltuielile lunii · ${monthly.length} ${
                    monthly.length === 1 ? 'cheltuială' : 'cheltuieli'
                  }`}
            </p>
          </CardContent>
        </Card>

        <Card className="sb-rise" style={delay(150)}>
          <CardContent>
            <SpendingTrendChart data={dailyTrend} period={period} />
          </CardContent>
        </Card>

        <Card className="sb-rise" style={delay(220)}>
          <CardContent>
            <ReceiptsList
              receipts={monthly}
              meUserId={user.id}
              creators={creators}
              title={`Toate cheltuielile · ${periodLabel(period)}`}
              emptyLabel="Nicio cheltuială în această categorie în perioada aleasă."
              // The list is already everything there is for this category, so
              // there is no "see all" to offer.
              historyHref={null}
              from={categoryPath(category, view)}
            />
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
