import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChartColumnIncreasing } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { monthlySpending } from '@/lib/dashboard/query';
import { monthKeyOf, monthKeyToDate, recentMonthKeys } from '@/lib/dashboard/aggregate';
import { monthKeyLabel } from '@/lib/dashboard/format';
import { buildAnalytics, type MonthlySpendRow } from '@/lib/analytics';
import { getHouseholdMembership, type HouseholdMemberInfo } from '@/lib/household/membership';
import { MonthlyTrendChart } from '@/components/monthly-trend-chart';
import { CategoryTrendList } from '@/components/category-trend-list';
import { HouseholdFilter } from '@/components/household-filter';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const WINDOW_MONTHS = 12;

export default async function AnalyticsPage({
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
  }

  const validWho = who === 'me' || (who && members.some((m) => m.userId === who)) ? who : null;
  const targetUserId = validWho === 'me' ? user.id : (validWho ?? null);

  const now = new Date();
  const months = recentMonthKeys(WINDOW_MONTHS, now);
  const from = monthKeyToDate(months[0]);
  // Exclusive upper bound: the first day of next month, so the live month is
  // included in full as it fills up.
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Summed in Postgres. A year of a shared household's expenses is exactly the
  // set that should never be pulled into this process to be added up here.
  const { data: rows, error } = await monthlySpending(supabase, from, to, targetUserId);

  const analytics = buildAnalytics((rows ?? []) as MonthlySpendRow[], now, WINDOW_MONTHS);
  const currentMonth = monthKeyOf(now);

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <div className="flex items-center justify-between gap-2 px-1">
          <h1 className="text-foreground text-lg font-semibold tracking-tight">Analiză</h1>
          <Button
            variant="link"
            className="text-muted-foreground px-0"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            <ArrowLeft />
            Dashboard
          </Button>
        </div>

        {members.length > 1 && (
          <div className="flex items-center justify-end gap-2 px-1">
            <span className="text-muted-foreground text-xs">Cheltuieli:</span>
            <HouseholdFilter members={members} meUserId={user.id} />
          </div>
        )}

        {error ? (
          <Card>
            <CardContent>
              <p className="text-destructive text-sm">
                Nu am putut încărca analiza. Încearcă din nou.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">Total {analytics.year}</span>
                  <span className="text-foreground text-xl font-semibold tabular-nums">
                    {analytics.yearTotal.toFixed(0)}
                    <span className="text-muted-foreground text-sm font-normal"> lei</span>
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">Medie pe lună</span>
                  <span className="text-foreground text-xl font-semibold tabular-nums">
                    {analytics.monthlyAverage === null ? '—' : analytics.monthlyAverage.toFixed(0)}
                    {analytics.monthlyAverage !== null && (
                      <span className="text-muted-foreground text-sm font-normal"> lei</span>
                    )}
                  </span>
                  <span className="text-muted-foreground/70 text-[11px]">
                    {analytics.completeMonthCount === 0
                      ? 'după prima lună încheiată'
                      : `din ${analytics.completeMonthCount} ${
                          analytics.completeMonthCount === 1 ? 'lună încheiată' : 'luni încheiate'
                        }`}
                  </span>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent>
                <MonthlyTrendChart
                  monthTotals={analytics.monthTotals}
                  monthlyAverage={analytics.monthlyAverage}
                  currentMonth={currentMonth}
                />
              </CardContent>
            </Card>

            {analytics.busiestMonth && (
              <Card>
                <CardContent className="flex items-center gap-3">
                  <div className="bg-muted text-muted-foreground flex h-10 w-10 flex-none items-center justify-center rounded-lg">
                    <ChartColumnIncreasing className="h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-muted-foreground text-xs">
                      Luna cu cele mai multe cheltuieli
                    </span>
                    <span className="text-foreground text-sm font-medium tabular-nums first-letter:uppercase">
                      {monthKeyLabel(analytics.busiestMonth.month)} ·{' '}
                      {analytics.busiestMonth.total.toFixed(2)} lei
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <CategoryTrendList trends={analytics.categoryTrends} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
