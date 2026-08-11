import { cn } from '@/lib/utils';
import type { BudgetStatus } from '@/lib/budgets';

/**
 * Semantic rather than category-coloured: a budget bar answers "am I fine?",
 * so the colour has to carry the answer. The category bars in the breakdown
 * keep their own hues, which is why the limit there is drawn as a tick instead.
 *
 * These are the reserved status tokens, not the palette accent. Binding "within
 * budget" to the accent would have made the coral palette read
 * good → warning → over as coral → amber → red: three warm hues with no
 * severity gradient between them.
 */
export const BUDGET_BAR_CLASS: Record<BudgetStatus, string> = {
  under: 'bg-ok',
  warning: 'bg-warn',
  over: 'bg-danger',
};

export const BUDGET_TEXT_CLASS: Record<BudgetStatus, string> = {
  under: 'text-ok-ink',
  warning: 'text-warn-ink',
  over: 'text-danger-ink',
};

/** The unfilled part, as a lighter step of the fill's own ramp — so the state
 *  reads across the whole bar rather than only across the filled part. */
const BUDGET_TRACK_CLASS: Record<BudgetStatus, string> = {
  under: 'bg-ok/15',
  warning: 'bg-warn/15',
  over: 'bg-danger/15',
};

export function BudgetBar({
  percentUsed,
  status,
  projectedPercent,
  className,
  trackClassName,
}: {
  percentUsed: number;
  status: BudgetStatus;
  /**
   * Where the month lands at the current pace, as a percentage of the limit.
   * Drawn as a marker ahead of the fill: the bar then shows both where you are
   * and where you are going, which is the difference between noticing an
   * overrun days early and noticing it on the 31st.
   */
  projectedPercent?: number | null;
  className?: string;
  /** Overridden on tinted surfaces, where the default track disappears. */
  trackClassName?: string;
}) {
  const filled = Math.min(Math.max(percentUsed, 0), 100);
  // Only worth drawing when it is meaningfully ahead of the fill and still on
  // the bar — a marker sitting under the fill's own edge is just noise.
  const marker =
    projectedPercent != null && projectedPercent > percentUsed + 4 && projectedPercent < 99
      ? projectedPercent
      : null;

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full',
        trackClassName ?? BUDGET_TRACK_CLASS[status],
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          BUDGET_BAR_CLASS[status],
        )}
        // Clamped: past the limit the bar is full and the colour carries the
        // overrun, which the "depășit cu X" line states exactly.
        style={{ width: `${filled}%` }}
      />

      {marker !== null && (
        <span
          aria-hidden
          className="bg-foreground/45 absolute inset-y-0 w-0.5 rounded-full transition-[left] duration-700 ease-out"
          style={{ left: `${marker}%` }}
        />
      )}
    </div>
  );
}
