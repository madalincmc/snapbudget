import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonthComparison } from '@/lib/dashboard/aggregate';

export function MonthComparisonCard({ comparison }: { comparison: MonthComparison }) {
  const { currentTotal, previousTotal, percentChange, hasPreviousData, direction } = comparison;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-sm">Total cheltuit luna aceasta</p>
      <p className="text-foreground text-4xl font-semibold tabular-nums">
        {currentTotal.toFixed(2)} lei
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-sm">
        {hasPreviousData ? (
          <>
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
            </span>
            <span className="text-muted-foreground">
              față de {previousTotal.toFixed(2)} lei luna trecută
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Fără date din luna trecută pentru comparație.</span>
        )}
      </div>
    </div>
  );
}
