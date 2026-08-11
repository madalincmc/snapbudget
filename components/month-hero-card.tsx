import Link from 'next/link';
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { monthKeyLabel } from '@/lib/dashboard/format';
import { shiftMonthKey, type MonthComparison, type MonthKey } from '@/lib/dashboard/aggregate';
import { BudgetBar, BUDGET_TEXT_CLASS } from '@/components/budget-bar';
import type { BudgetProgress } from '@/lib/budgets';

/** Thousands separated by a thin space — "2 767.77" scans far faster than "2767.77". */
function money(value: number, decimals = 2): string {
  const [whole, fraction] = value.toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/**
 * The one card that answers the question people open the app for: how much,
 * and is that a problem. Those were two stacked cards that each restated the
 * month total — the number and the limit it is measured against belong in one
 * place, so the budget line lives here rather than in a card of its own.
 */
export function MonthHeroCard({
  comparison,
  avgDailySpend,
  month,
  isCurrentMonth,
  budget,
}: {
  comparison: MonthComparison;
  avgDailySpend: number;
  month: MonthKey;
  isCurrentMonth: boolean;
  /** The overall budget for this view, when one is set and the month is live. */
  budget?: BudgetProgress | null;
}) {
  const { currentTotal, previousTotal, percentChange, hasPreviousData, direction } = comparison;
  const previousLabel = monthKeyLabel(shiftMonthKey(month, -1));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Cheltuit în {monthKeyLabel(month)}
        </p>

        {/* Proportional figures: tabular-nums pads every digit to the width of
            a zero, which reads visibly loose at display size. */}
        <p className="text-foreground text-[2.75rem] leading-none font-semibold tracking-tight">
          {money(currentTotal)}
          <span className="text-muted-foreground ml-1.5 text-2xl font-medium">lei</span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {hasPreviousData ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                direction === 'up' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                direction === 'down' && 'bg-primary/10 text-primary',
                direction === 'flat' && 'bg-muted text-muted-foreground',
              )}
            >
              {direction === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
              {direction === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
              {direction === 'flat' && <Minus className="h-3.5 w-3.5" />}
              {percentChange === null
                ? '—'
                : `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%`}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              {isCurrentMonth ? 'Prima lună — nimic de comparat' : 'Nimic în luna anterioară'}
            </span>
          )}

          <span className="text-muted-foreground text-xs">
            {hasPreviousData && (
              <>
                față de {previousLabel} ({money(previousTotal, 0)} lei)
              </>
            )}
            {hasPreviousData && currentTotal > 0 && ' · '}
            {currentTotal > 0 && (
              <span className="tabular-nums">{money(avgDailySpend, 0)} lei/zi</span>
            )}
          </span>
        </div>
      </div>

      {budget ? (
        <div className="border-border/70 flex flex-col gap-2 border-t pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground text-xs">
              Buget <span className="tabular-nums">{money(budget.budget.amount, 0)}</span> lei
            </span>
            <span
              className={cn('text-xs font-semibold tabular-nums', BUDGET_TEXT_CLASS[budget.status])}
            >
              {Math.round(budget.percentUsed)}%
            </span>
          </div>

          <BudgetBar percentUsed={budget.percentUsed} status={budget.status} />

          <p className="text-muted-foreground text-xs tabular-nums">
            {budget.remaining >= 0
              ? `Au mai rămas ${money(budget.remaining, 0)} lei`
              : `Depășit cu ${money(Math.abs(budget.remaining), 0)} lei`}
            {budget.projected !== null && (
              <>
                {' · '}
                <span className={budget.status === 'warning' ? BUDGET_TEXT_CLASS.warning : ''}>
                  în ritmul actual ~{money(budget.projected, 0)} lei
                </span>
              </>
            )}
          </p>
        </div>
      ) : (
        isCurrentMonth && (
          <Link
            href="/budgets"
            className="text-muted-foreground hover:text-primary border-border/70 group/set inline-flex items-center gap-1.5 border-t pt-4 text-xs font-medium transition-colors"
          >
            Pune un buget lunar și vezi cât mai ai
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/set:translate-x-0.5" />
          </Link>
        )
      )}
    </div>
  );
}
