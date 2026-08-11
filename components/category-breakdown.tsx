import { ChevronDown } from 'lucide-react';
import { CATEGORY_BAR_CLASS, type Category } from '@/lib/categories';
import { BUDGET_TEXT_CLASS } from '@/components/budget-bar';
import { cn } from '@/lib/utils';
import type { BudgetProgress } from '@/lib/budgets';
import type { CategoryTotal } from '@/lib/dashboard/aggregate';

/** Categories shown before the list collapses; the rest sit behind a disclosure. */
const VISIBLE_COUNT = 5;

function CategoryRow({
  category,
  total,
  share,
  max,
  budget,
}: {
  category: Category;
  total: number;
  share: number;
  max: number;
  budget?: BudgetProgress;
}) {
  // The bar is scaled to the biggest category, not to the limit, so the tick
  // lands where the limit actually falls against its peers. A limit above the
  // tallest bar would sit off the end — clamped so it stays visible and still
  // reads as "not reached yet".
  const tickPercent = budget && max > 0 ? Math.min((budget.budget.amount / max) * 100, 99) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-foreground min-w-0 truncate font-medium">{category}</span>
        <span className="flex flex-none items-baseline gap-2">
          {/* Share carries the comparison the bar only implies, and keeps its
              meaning when a screenshot loses the bar. */}
          <span className="text-muted-foreground/70 text-xs tabular-nums">{share}%</span>
          <span
            className={cn(
              'tabular-nums',
              budget && budget.status !== 'under'
                ? BUDGET_TEXT_CLASS[budget.status]
                : 'text-foreground',
            )}
          >
            {total.toFixed(2)}
            <span className="text-muted-foreground/70 text-xs"> lei</span>
          </span>
        </span>
      </div>

      {/* Thin: eight full-width bars at the old height read as a barcode and
          swamped everything below them on the page. */}
      <div className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full', CATEGORY_BAR_CLASS[category])}
          style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
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
          <span className={budget.status === 'under' ? '' : BUDGET_TEXT_CLASS[budget.status]}>
            {budget.remaining >= 0
              ? `au mai rămas ${budget.remaining.toFixed(0)}`
              : `depășit cu ${Math.abs(budget.remaining).toFixed(0)}`}
          </span>
        </p>
      )}
    </div>
  );
}

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

  const shareOf = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const visible = withSpending.slice(0, VISIBLE_COUNT);
  const hidden = withSpending.slice(VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Pe categorii
      </h2>

      {withSpending.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială luna aceasta.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map(({ category, total: categoryTotal }) => (
            <CategoryRow
              key={category}
              category={category}
              total={categoryTotal}
              share={shareOf(categoryTotal)}
              max={max}
              budget={budgets[category]}
            />
          ))}

          {hidden.length > 0 && (
            // <details> rather than state: the disclosure works with no
            // JavaScript and keeps this whole surface a server component.
            <details className="group/more flex flex-col gap-4">
              <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs font-medium transition-colors marker:content-none">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/more:rotate-180" />
                <span className="group-open/more:hidden">
                  Încă {hidden.length} {hidden.length === 1 ? 'categorie' : 'categorii'}
                </span>
                <span className="hidden group-open/more:inline">Arată mai puțin</span>
              </summary>

              <div className="mt-4 flex flex-col gap-4">
                {hidden.map(({ category, total: categoryTotal }) => (
                  <CategoryRow
                    key={category}
                    category={category}
                    total={categoryTotal}
                    share={shareOf(categoryTotal)}
                    max={max}
                    budget={budgets[category]}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
