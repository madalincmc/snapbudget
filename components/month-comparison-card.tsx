import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { monthKeyLabel } from '@/lib/dashboard/format';
import { shiftMonthKey, type MonthKey } from '@/lib/dashboard/aggregate';
import type { MonthComparison } from '@/lib/dashboard/aggregate';

export function MonthComparisonCard({
  comparison,
  avgDailySpend,
  month,
  isCurrentMonth,
}: {
  comparison: MonthComparison;
  avgDailySpend: number;
  month: MonthKey;
  isCurrentMonth: boolean;
}) {
  const { currentTotal, previousTotal, percentChange, hasPreviousData, direction } = comparison;
  const previousLabel = monthKeyLabel(shiftMonthKey(month, -1));

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-sm">Cheltuit în {monthKeyLabel(month)}</p>
      {/* Proportional figures: tabular-nums pads every digit to the width of a
          zero, which reads visibly loose at display size. */}
      <p className="text-foreground text-[2.5rem] leading-none font-semibold">
        {currentTotal.toFixed(2)} <span className="text-3xl">lei</span>
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {hasPreviousData ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-medium tabular-nums',
              direction === 'up' && 'text-red-600 dark:text-red-400',
              direction === 'down' && 'text-emerald-600 dark:text-emerald-400',
              direction === 'flat' && 'text-muted-foreground',
            )}
          >
            {direction === 'up' && <TrendingUp className="h-4 w-4" />}
            {direction === 'down' && <TrendingDown className="h-4 w-4" />}
            {direction === 'flat' && <Minus className="h-4 w-4" />}
            {percentChange === null
              ? '—'
              : `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%`}
            <span className="text-muted-foreground font-normal">față de {previousLabel}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            {isCurrentMonth ? 'Prima lună — nimic de comparat încă.' : 'Nimic în luna anterioară.'}
          </span>
        )}

        {currentTotal > 0 && (
          <>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round(avgDailySpend)} lei/zi
            </span>
          </>
        )}
      </div>

      {hasPreviousData && (
        <p className="text-muted-foreground/80 mt-0.5 text-xs tabular-nums">
          {previousLabel}: {previousTotal.toFixed(2)} lei
        </p>
      )}
    </div>
  );
}
