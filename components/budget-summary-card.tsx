import Link from 'next/link';
import { ChevronRight, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetBar, BUDGET_TEXT_CLASS } from '@/components/budget-bar';
import { cn } from '@/lib/utils';
import type { BudgetOverview, BudgetScope } from '@/lib/budgets';

function countOf(byCategory: BudgetOverview['byCategory']): number {
  return Object.keys(byCategory).length;
}

/**
 * Doubles as the entry point to /budgets, the way RecurringSummaryCard does for
 * recurring rules: a fourth nav tab would overweight something you set once,
 * but "how much of the month is left" is worth a glance on every open.
 */
export function BudgetSummaryCard({
  overview,
  scope,
}: {
  overview: BudgetOverview;
  scope: BudgetScope;
}) {
  const { overall, byCategory, hasAny } = overview;
  const categoryCount = countOf(byCategory);
  const overCount = Object.values(byCategory).filter((p) => p.status === 'over').length;

  if (!hasAny) {
    return (
      <Link href="/budgets" className="group/budget block">
        <Card className="group-hover/budget:bg-muted/40 transition-colors">
          <CardContent className="flex items-center gap-3">
            <div className="bg-muted text-muted-foreground flex h-10 w-10 flex-none items-center justify-center rounded-lg">
              <Target className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-foreground text-sm font-medium">Buget lunar</span>
              <span className="text-muted-foreground truncate text-xs">
                Pune o limită și vezi cât mai ai până la sfârșitul lunii
              </span>
            </div>
            <ChevronRight className="text-muted-foreground h-4 w-4 flex-none" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href="/budgets" className="group/budget block">
      <Card className="group-hover/budget:bg-muted/40 transition-colors">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex-1 text-sm font-medium">
              {scope === 'household' ? 'Bugetul gospodăriei' : 'Bugetul meu'}
            </span>
            <ChevronRight className="text-muted-foreground h-4 w-4 flex-none" />
          </div>

          {overall ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-foreground text-lg font-semibold tabular-nums">
                  {overall.spent.toFixed(2)}
                  <span className="text-muted-foreground text-sm font-normal">
                    {' '}
                    din {overall.budget.amount.toFixed(2)} lei
                  </span>
                </span>
                <span
                  className={cn(
                    'flex-none text-sm font-medium tabular-nums',
                    BUDGET_TEXT_CLASS[overall.status],
                  )}
                >
                  {Math.round(overall.percentUsed)}%
                </span>
              </div>

              <BudgetBar percentUsed={overall.percentUsed} status={overall.status} />

              <p className="text-muted-foreground text-xs tabular-nums">
                {overall.remaining >= 0
                  ? `Au mai rămas ${overall.remaining.toFixed(2)} lei`
                  : `Depășit cu ${Math.abs(overall.remaining).toFixed(2)} lei`}
                {overall.projected !== null && (
                  <>
                    <span className="text-muted-foreground/50" aria-hidden>
                      {' · '}
                    </span>
                    <span className={overall.status === 'warning' ? BUDGET_TEXT_CLASS.warning : ''}>
                      în ritmul actual ~{Math.round(overall.projected)} lei
                    </span>
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {categoryCount === 1
                ? 'O limită pe categorie'
                : `${categoryCount} limite pe categorii`}
              . Nicio limită pe total încă.
            </p>
          )}

          {categoryCount > 0 && overCount > 0 && (
            <p className={cn('text-xs font-medium', BUDGET_TEXT_CLASS.over)}>
              {overCount === 1
                ? 'O categorie a depășit limita'
                : `${overCount} categorii au depășit limita`}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
