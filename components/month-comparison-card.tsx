import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { monthName, previousMonthName } from '@/lib/dashboard/format';
import type { MonthComparison } from '@/lib/dashboard/aggregate';

export function MonthComparisonCard({
  comparison,
  avgDailySpend,
  now = new Date(),
}: {
  comparison: MonthComparison;
  avgDailySpend: number;
  now?: Date;
}) {
  const { currentTotal, previousTotal, percentChange, hasPreviousData, direction } = comparison;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-sm">Cheltuit în {monthName(now)}</p>
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
            <span className="text-muted-foreground font-normal">
              față de {previousMonthName(now)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Prima lună — nimic de comparat încă.</span>
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
          {previousMonthName(now)}: {previousTotal.toFixed(2)} lei
        </p>
      )}
    </div>
  );
}
