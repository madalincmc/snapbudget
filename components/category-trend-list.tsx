import type * as React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { CATEGORY_BAR_CLASS, CATEGORY_FILL_CLASS, CATEGORY_VAR } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/categories';
import type { CategoryTrend } from '@/lib/analytics';

const SPARK_WIDTH = 68;
const SPARK_HEIGHT = 20;
const SPARK_PAD = 2;

/**
 * A line rather than a number per month: the question this answers is "which
 * way is this going", and twelve figures per category would bury that under
 * 108 numbers on a phone screen. It replaced twelve micro-bars — at 5px apart
 * the bars encoded the shape as a texture, where a line states it.
 *
 * The mark specs in the design system are written for full charts; a 68×20
 * sparkline scales them down (1.5px line, 3px end dot) or the marks would be
 * most of the plot. The end dot is on the latest month, which is the value the
 * change badge beside it is about.
 */
function Sparkline({ values, category }: { values: number[]; category: Category }) {
  const max = Math.max(...values, 0);
  if (max <= 0 || values.length < 2) return null;

  const stepX = (SPARK_WIDTH - SPARK_PAD * 2) / (values.length - 1);
  const scaleY = (value: number) =>
    SPARK_HEIGHT - SPARK_PAD - (value / max) * (SPARK_HEIGHT - SPARK_PAD * 2);

  const points = values.map((value, i) => [SPARK_PAD + i * stepX, scaleY(value)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  const area = [
    ...line,
    `L${points[points.length - 1][0].toFixed(1)} ${SPARK_HEIGHT}`,
    `L${points[0][0].toFixed(1)} ${SPARK_HEIGHT}`,
    'Z',
  ].join(' ');
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      className="h-5 w-[68px] flex-none overflow-visible"
      aria-hidden
      focusable="false"
    >
      <path d={area} className={CATEGORY_FILL_CLASS[category]} opacity={0.12} />
      <path
        d={line.join(' ')}
        fill="none"
        stroke={CATEGORY_VAR[category]}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        // Drawn left to right on first paint. The dash length is a generous
        // upper bound on the path — measuring it would mean a client component
        // and a layout effect for a 68px decoration.
        className="sb-draw"
        style={{ '--draw-length': 130 } as React.CSSProperties}
      />
      <circle cx={lastX} cy={lastY} r={1.8} fill={CATEGORY_VAR[category]} />
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
        flat ? 'text-muted-foreground' : up ? 'text-danger-ink' : 'text-ok-ink',
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
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Categorii în timp
        </h2>
        <span className="text-muted-foreground/70 text-xs">ultima lună vs. media</span>
      </div>

      {trends.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială de analizat încă.</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {trends.map((trend, index) => (
            <li
              key={trend.category}
              style={{ '--sb-delay': `${index * 45}ms` } as React.CSSProperties}
              className="sb-rise flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0"
            >
              <span
                className={cn('h-2 w-2 flex-none rounded-full', CATEGORY_BAR_CLASS[trend.category])}
                aria-hidden
              />
              <span className="text-foreground min-w-0 flex-1 truncate text-sm">
                {trend.category}
              </span>

              <Sparkline values={trend.monthly} category={trend.category} />

              <span className="text-muted-foreground w-18 flex-none text-right text-sm tabular-nums">
                {trend.total.toFixed(0)} lei
              </span>

              <span className="w-14 flex-none text-right">
                <ChangeBadge changePercent={trend.changePercent} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
