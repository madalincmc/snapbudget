import { CATEGORY_BAR_CLASS, type Category } from '@/lib/categories';
import { BUDGET_TEXT_CLASS } from '@/components/budget-bar';
import { cn } from '@/lib/utils';
import type { BudgetProgress } from '@/lib/budgets';
import type { CategoryTotal } from '@/lib/dashboard/aggregate';

export function CategoryBreakdown({
  categoryTotals,
  budgets = {},
}: {
  categoryTotals: CategoryTotal[];
  budgets?: Partial<Record<Category, BudgetProgress>>;
}) {
  const withSpending = categoryTotals.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const max = Math.max(...withSpending.map((c) => c.total), 0);
  const total = withSpending.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm font-medium">Pe categorii</h2>
      {withSpending.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială luna aceasta.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {withSpending.map(({ category, total: categoryTotal }) => {
            const budget = budgets[category];
            // The bar is scaled to the biggest category, not to the limit, so
            // the tick lands where the limit actually falls against its peers.
            // A limit above the tallest bar would sit off the end — clamped so
            // it stays visible and still reads as "not reached yet".
            const tickPercent =
              budget && max > 0 ? Math.min((budget.budget.amount / max) * 100, 99) : null;

            return (
              <div key={category} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-foreground truncate">{category}</span>
                  <span className="flex flex-none items-baseline gap-2">
                    {/* Share carries the comparison the bar only implies, and
                        keeps its meaning when a screenshot loses the bar. */}
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {total > 0 ? Math.round((categoryTotal / total) * 100) : 0}%
                    </span>
                    <span
                      className={cn(
                        'tabular-nums',
                        budget && budget.status !== 'under'
                          ? BUDGET_TEXT_CLASS[budget.status]
                          : 'text-foreground',
                      )}
                    >
                      {categoryTotal.toFixed(2)} lei
                    </span>
                  </span>
                </div>

                <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${CATEGORY_BAR_CLASS[category]}`}
                    style={{ width: `${max > 0 ? (categoryTotal / max) * 100 : 0}%` }}
                  />
                  {tickPercent !== null && (
                    <div
                      className="bg-foreground/50 absolute inset-y-0 w-0.5"
                      style={{ left: `${tickPercent}%` }}
                      aria-hidden
                    />
                  )}
                </div>

                {budget && (
                  <p className="text-muted-foreground text-xs tabular-nums">
                    Buget {budget.budget.amount.toFixed(0)} lei ·{' '}
                    <span
                      className={budget.status === 'under' ? '' : BUDGET_TEXT_CLASS[budget.status]}
                    >
                      {budget.remaining >= 0
                        ? `au mai rămas ${budget.remaining.toFixed(0)}`
                        : `depășit cu ${Math.abs(budget.remaining).toFixed(0)}`}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
