import { cn } from '@/lib/utils';
import type { BudgetStatus } from '@/lib/budgets';

/**
 * Semantic rather than category-coloured: a budget bar answers "am I fine?",
 * so the colour has to carry the answer. The category bars in the breakdown
 * keep their own hues, which is why the limit there is drawn as a tick instead.
 *
 * "Under" is the brand emerald rather than a one-off green — being within
 * budget is the app's happy path, so it should look like the app.
 */
export const BUDGET_BAR_CLASS: Record<BudgetStatus, string> = {
  under: 'bg-primary',
  warning: 'bg-amber-500 dark:bg-amber-400',
  over: 'bg-red-500 dark:bg-red-400',
};

export const BUDGET_TEXT_CLASS: Record<BudgetStatus, string> = {
  under: 'text-primary',
  warning: 'text-amber-600 dark:text-amber-400',
  over: 'text-red-600 dark:text-red-400',
};

export function BudgetBar({
  percentUsed,
  status,
  className,
  trackClassName,
}: {
  percentUsed: number;
  status: BudgetStatus;
  className?: string;
  /** Overridden on tinted surfaces, where the default track disappears. */
  trackClassName?: string;
}) {
  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full',
        trackClassName ?? 'bg-muted',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500',
          BUDGET_BAR_CLASS[status],
        )}
        // Clamped: past the limit the bar is full and the colour carries the
        // overrun, which the "depășit cu X" line states exactly.
        style={{ width: `${Math.min(Math.max(percentUsed, 0), 100)}%` }}
      />
    </div>
  );
}
