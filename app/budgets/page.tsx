import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Target, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';
import { buildDashboardData, monthKeyOf, type ReceiptRow } from '@/lib/dashboard/aggregate';
import { expensesSince, startOfMonth } from '@/lib/dashboard/query';
import { getHouseholdMembership } from '@/lib/household/membership';
import {
  buildBudgetOverview,
  parseBudgetRow,
  type Budget,
  type BudgetRow,
  type BudgetScope,
} from '@/lib/budgets';
import { BudgetBar, BUDGET_TEXT_CLASS } from '@/components/budget-bar';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { deleteBudget, saveBudget } from './actions';

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const membership = await getHouseholdMembership(supabase, user.id);
  const { scope: scopeParam } = await searchParams;

  // Household is the default when there is one: its budget is what the
  // dashboard shows by default, so the two screens agree on first open.
  const scope: BudgetScope = membership && scopeParam !== 'personal' ? 'household' : 'personal';

  let budgetQuery = supabase.from('budgets').select('id, household_id, category, amount');
  budgetQuery =
    scope === 'household'
      ? budgetQuery.eq('household_id', membership!.householdId)
      : budgetQuery.is('household_id', null).eq('user_id', user.id);

  const now = new Date();
  const monthStart = startOfMonth(now);

  // Personal budgets are measured against the owner's expenses only; household
  // budgets against everything the household can see (which is what RLS
  // already returns). Same two sets the dashboard's "who" filter switches.
  let spendQuery = expensesSince(supabase, monthStart);
  if (scope === 'personal') {
    spendQuery = spendQuery.eq('user_id', user.id);
  }

  const [{ data: budgetRows }, { data: spendRows }] = await Promise.all([budgetQuery, spendQuery]);

  const budgets = ((budgetRows ?? []) as BudgetRow[])
    .map(parseBudgetRow)
    .filter((b): b is Budget => b !== null);

  // Budgets are always about the month in progress, so the period is `now`'s
  // month rather than anything the URL could select.
  const { monthTotal, categoryTotals } = buildDashboardData(
    (spendRows ?? []) as ReceiptRow[],
    monthKeyOf(now),
    now,
  );
  const overview = buildBudgetOverview(budgets, monthTotal, categoryTotals, now);

  const budgetedCategories = new Set(Object.keys(overview.byCategory));
  const availableCategories = CATEGORIES.filter((c) => !budgetedCategories.has(c));

  const scopeHref = (target: BudgetScope) =>
    target === 'personal' ? '/budgets?scope=personal' : '/budgets';

  return (
    <div className="bg-muted/40 pb-nav flex flex-1 justify-center px-4 pt-6">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <h1 className="text-foreground text-lg font-semibold">Bugete</h1>
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

        {membership && (
          <div className="bg-muted text-muted-foreground flex gap-1 rounded-full p-1 text-sm">
            {(['household', 'personal'] as const).map((target) => (
              <Link
                key={target}
                href={scopeHref(target)}
                aria-current={scope === target ? 'page' : undefined}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-center font-medium transition-colors',
                  scope === target
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:text-foreground',
                )}
              >
                {target === 'household' ? 'Gospodărie' : 'Doar eu'}
              </Link>
            ))}
          </div>
        )}

        <p className="text-muted-foreground px-1 text-xs">
          {scope === 'household'
            ? 'Se compară cu toate cheltuielile gospodăriei. Orice membru poate modifica aceste bugete.'
            : 'Se compară doar cu cheltuielile tale.'}
        </p>

        {/* Overall budget */}
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-foreground text-sm font-medium">Buget total lunar</h2>

            {overview.overall ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground text-lg font-semibold tabular-nums">
                    {overview.overall.spent.toFixed(2)}
                    <span className="text-muted-foreground text-sm font-normal">
                      {' '}
                      din {overview.overall.budget.amount.toFixed(2)} lei
                    </span>
                  </span>
                  <form action={deleteBudget.bind(null, overview.overall.budget.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                    >
                      <Trash2 />
                      <span className="sr-only">Șterge bugetul total</span>
                    </Button>
                  </form>
                </div>
                <BudgetBar
                  percentUsed={overview.overall.percentUsed}
                  status={overview.overall.status}
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                  {overview.overall.remaining >= 0
                    ? `Au mai rămas ${overview.overall.remaining.toFixed(2)} lei`
                    : `Depășit cu ${Math.abs(overview.overall.remaining).toFixed(2)} lei`}
                  {overview.overall.projected !== null && (
                    <>
                      {' · '}
                      <span
                        className={
                          overview.overall.status === 'warning' ? BUDGET_TEXT_CLASS.warning : ''
                        }
                      >
                        în ritmul actual ~{Math.round(overview.overall.projected)} lei
                      </span>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nicio limită pe total. Pune una și vezi cât mai ai până la sfârșitul lunii.
              </p>
            )}

            <form action={saveBudget} className="flex items-end gap-2">
              <input type="hidden" name="scope" value={scope} />
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="overall-amount">
                  {overview.overall ? 'Schimbă limita (lei)' : 'Limită lunară (lei)'}
                </Label>
                <Input
                  id="overall-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  placeholder="ex: 3000"
                  required
                />
              </div>
              <Button type="submit" className="flex-none">
                {overview.overall ? 'Schimbă' : 'Setează'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Per-category limits */}
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-foreground text-sm font-medium">Limite pe categorii</h2>

            {Object.keys(overview.byCategory).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nicio limită pe categorii. Utile pentru cele care fug ușor — mâncare, divertisment.
              </p>
            ) : (
              <ul className="divide-border flex flex-col divide-y">
                {CATEGORIES.filter((c) => overview.byCategory[c]).map((category) => {
                  const progress = overview.byCategory[category]!;
                  return (
                    <li key={category} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-foreground truncate text-sm">{category}</span>
                        <div className="flex flex-none items-center gap-1">
                          <span className="text-muted-foreground text-sm tabular-nums">
                            {progress.spent.toFixed(0)} / {progress.budget.amount.toFixed(0)} lei
                          </span>
                          <form action={deleteBudget.bind(null, progress.budget.id)}>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                            >
                              <Trash2 />
                              <span className="sr-only">Șterge limita pentru {category}</span>
                            </Button>
                          </form>
                        </div>
                      </div>
                      <BudgetBar percentUsed={progress.percentUsed} status={progress.status} />
                      <p
                        className={cn(
                          'text-xs tabular-nums',
                          progress.status === 'under'
                            ? 'text-muted-foreground'
                            : BUDGET_TEXT_CLASS[progress.status],
                        )}
                      >
                        {progress.remaining >= 0
                          ? `Au mai rămas ${progress.remaining.toFixed(0)} lei`
                          : `Depășit cu ${Math.abs(progress.remaining).toFixed(0)} lei`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            {availableCategories.length > 0 && (
              <form action={saveBudget} className="flex flex-col gap-3">
                <input type="hidden" name="scope" value={scope} />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="category-limit">Adaugă o limită</Label>
                  <Select name="category" defaultValue={availableCategories[0]} required>
                    <SelectTrigger id="category-limit" className="h-9 w-full">
                      <SelectValue placeholder="Categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="category-amount">Limită lunară (lei)</Label>
                    <Input
                      id="category-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      placeholder="ex: 800"
                      required
                    />
                  </div>
                  <Button type="submit" variant="outline" className="flex-none">
                    Adaugă
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {!overview.hasAny && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-2xl">
                <Target className="h-6 w-6" />
              </div>
              <p className="text-muted-foreground mx-auto max-w-xs text-sm">
                Un buget nu blochează nimic — doar arată, pe dashboard, cât ai consumat din el și
                unde ajungi până la sfârșitul lunii în ritmul actual.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
