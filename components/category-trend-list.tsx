import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { CATEGORY_FILL_CLASS } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { CategoryTrend } from '@/lib/analytics';

const SPARK_WIDTH = 64;
const SPARK_HEIGHT = 18;

/**
 * A sparkline rather than a number per month: the question this answers is
 * "which way is this going", and twelve figures per category would bury that
 * under 108 numbers on a phone screen.
 */
function Sparkline({ values, className }: { values: number[]; className: string }) {
  const max = Math.max(...values, 0);
  if (max <= 0) return null;

  const slot = SPARK_WIDTH / values.length;
  const barWidth = Math.max(slot * 0.6, 1);

  return (
    <svg
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      className="h-4 w-16 flex-none"
      aria-hidden
      focusable="false"
    >
      {values.map((value, i) => {
        const height = value > 0 ? Math.max((value / max) * SPARK_HEIGHT, 1.5) : 0;
        return (
          <rect
            key={i}
            x={i * slot + (slot - barWidth) / 2}
            y={SPARK_HEIGHT - height}
            width={barWidth}
            height={height}
            rx={0.5}
            className={cn('opacity-70', className)}
          />
        );
      })}
    </svg>
  );
}

function ChangeBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) {
    return <span className="text-muted-foreground/60 text-xs">—</span>;
  }

  // A couple of percent either way is noise, not a trend worth colouring.
  const flat = Math.abs(changePercent) < 5;
  const up = changePercent > 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        flat
          ? 'text-muted-foreground'
          : up
            ? 'text-red-600 dark:text-red-400'
            : 'text-emerald-600 dark:text-emerald-400',
      )}
    >
      {flat ? (
        <Minus className="h-3 w-3" />
      ) : up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? '+' : ''}
      {changePercent.toFixed(0)}%
    </span>
  );
}

export function CategoryTrendList({ trends }: { trends: CategoryTrend[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Categorii în timp</h2>
        <span className="text-muted-foreground/70 text-xs">ultima lună vs. media</span>
      </div>

      {trends.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială de analizat încă.</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {trends.map((trend) => (
            <li
              key={trend.category}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-foreground min-w-0 flex-1 truncate text-sm">
                {trend.category}
              </span>

              <Sparkline values={trend.monthly} className={CATEGORY_FILL_CLASS[trend.category]} />

              <span className="text-muted-foreground w-20 flex-none text-right text-sm tabular-nums">
                {trend.total.toFixed(0)} lei
              </span>

              <span className="w-16 flex-none text-right">
                <ChangeBadge changePercent={trend.changePercent} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
