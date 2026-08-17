import Link from 'next/link';
import { ArrowRight, LogIn } from 'lucide-react';
import {
  buildPeriodData,
  monthKeyOf,
  toDateString,
  type ReceiptRow,
} from '@/lib/dashboard/aggregate';
import { periodFetchRange, periodFromParams } from '@/lib/dashboard/period';
import { buildBudgetOverview, scopeForView } from '@/lib/budgets';
import {
  DEMO_HOUSEHOLD_BUDGETS,
  DEMO_ME,
  DEMO_ME_FIRST_NAME,
  DEMO_MEMBERS,
  DEMO_PERSONAL_BUDGETS,
  demoReceipts,
} from '@/lib/demo/fixtures';
import { PeriodPicker } from '@/components/period-picker';
import { AppearanceMenu } from '@/components/appearance-menu';
import { CategoryBreakdown } from '@/components/category-breakdown';
import { MonthHeroCard } from '@/components/month-hero-card';
import { TrendInsightCards } from '@/components/trend-insight-cards';
import { SpendingTrendChart } from '@/components/spending-trend-chart';
import { ReceiptsList } from '@/components/receipts-list';
import { HouseholdFilter } from '@/components/household-filter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { delay } from '@/lib/utils';

/**
 * The dashboard, on the demo household.
 *
 * Deliberately the same components in the same order as `app/dashboard`, fed
 * by the same buildDashboardData and buildBudgetOverview — including the "who"
 * filter and the rule that decides which budget a view is measured against.
 * The parts that cannot exist without an account are the only ones that
 * differ: signing out, opening a receipt, and the quick links to screens the
 * demo does not carry.
 */
export default async function DemoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; month?: string; from?: string; to?: string }>;
}) {
  const { who, month: monthParam, from: fromParam, to: toParam } = await searchParams;

  const validWho = who === 'me' || (who && DEMO_MEMBERS.some((m) => m.userId === who)) ? who : null;
  const targetUserId = validWho === 'me' ? DEMO_ME : validWho;

  const now = new Date();
  const currentMonth = monthKeyOf(now);
  const period = periodFromParams({ month: monthParam, from: fromParam, to: toParam }, now);
  const isCurrentMonth = period.month === currentMonth;

  const all = demoReceipts(now);
  const mine = targetUserId ? all.filter((r) => r.user_id === targetUserId) : all;

  // The same window the real page fetches, resolved by the same code.
  const { from, to } = periodFetchRange(period);
  const inRange = mine.filter((r: ReceiptRow) => {
    const day = r.purchase_date ?? r.created_at.slice(0, 10);
    return day >= toDateString(from) && day < toDateString(to);
  });

  const latest = [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  const {
    categoryTotals,
    comparison,
    topCategory,
    biggestExpense,
    avgDailySpend,
    dailyTrend,
    total: monthTotal,
  } = buildPeriodData(inRange, period);

  const budgetScope = isCurrentMonth ? scopeForView(true, validWho ?? null) : null;
  const budgets =
    budgetScope === 'household'
      ? DEMO_HOUSEHOLD_BUDGETS
      : budgetScope === 'personal'
        ? DEMO_PERSONAL_BUDGETS
        : [];
  const budgetOverview = buildBudgetOverview(budgets, monthTotal, categoryTotals, now);

  const creators = Object.fromEntries(
    DEMO_MEMBERS.map((m) => [m.userId, { displayName: m.displayName }]),
  );

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <header className="sb-fade flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-muted-foreground text-xs">Salut,</span>
            <h1 className="text-foreground truncate text-base leading-tight font-semibold">
              {DEMO_ME_FIRST_NAME}
            </h1>
          </div>

          <div className="flex flex-none items-center gap-1">
            <HouseholdFilter members={DEMO_MEMBERS} meUserId={DEMO_ME} />
            <AppearanceMenu />
            {/* Where the sign-out control sits in the real app. There is no
                session to end here, so it offers to start one. */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground/70 hover:text-foreground"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              <LogIn />
              <span className="sr-only">Intră în cont</span>
            </Button>
          </div>
        </header>

        <div className="sb-fade -mt-1 flex justify-center" style={delay(40)}>
          <PeriodPicker period={period} currentMonth={currentMonth} />
        </div>

        <Card className="sb-rise [--card-spacing:--spacing(5)]" style={delay(80)}>
          <CardContent>
            <MonthHeroCard
              comparison={comparison}
              avgDailySpend={avgDailySpend}
              period={period}
              budget={budgetScope ? budgetOverview.overall : null}
            />
          </CardContent>
        </Card>

        <TrendInsightCards topCategory={topCategory} biggestExpense={biggestExpense} />

        <Card className="sb-rise" style={delay(220)}>
          <CardContent>
            <CategoryBreakdown
              categoryTotals={categoryTotals}
              budgets={budgetOverview.byCategory}
            />
          </CardContent>
        </Card>

        <Card className="sb-rise" style={delay(290)}>
          <CardContent>
            <SpendingTrendChart data={dailyTrend} period={period} />
          </CardContent>
        </Card>

        {isCurrentMonth && (
          <Card className="sb-rise" style={delay(360)}>
            <CardContent>
              <ReceiptsList
                receipts={latest}
                meUserId={DEMO_ME}
                creators={creators}
                historyHref="/demo/history"
                linkReceipts={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Stands in for the quick links to recurring, analytics and budgets:
            those screens are not part of the demo, and a link that lands on a
            login form is not a demo of anything. */}
        <Card className="sb-rise" style={delay(430)}>
          <CardContent className="flex flex-col items-start gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-sm font-medium">
                Cheltuielile tale, în locul celor ale Anei
              </p>
              <p className="text-muted-foreground text-xs">
                Fotografiezi bonul, iar magazinul, suma și categoria se completează singure. Inviți
                pe cine vrei în gospodărie și vedeți aceleași totaluri.
              </p>
            </div>
            <Button className="rounded-full" nativeButton={false} render={<Link href="/login" />}>
              Începe cu contul tău
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
