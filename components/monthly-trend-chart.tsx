'use client';

import { useState } from 'react';
import { monthKeyLabel, monthKeyShortLabel } from '@/lib/dashboard/format';
import type { MonthTotal } from '@/lib/analytics';

const VB_WIDTH = 300;
const VB_HEIGHT = 110;
const TOP_PAD = 18;
const BASELINE_Y = 92;
const MAX_BAR_HEIGHT = BASELINE_Y - TOP_PAD;
const MIN_VISIBLE_HEIGHT = 2;

export function MonthlyTrendChart({
  monthTotals,
  monthlyAverage,
  currentMonth,
}: {
  monthTotals: MonthTotal[];
  monthlyAverage: number | null;
  currentMonth: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // The average line can sit above every bar (one big month early on drags it
  // up), so the scale has to accommodate it or it would be clipped off-canvas.
  const max = Math.max(...monthTotals.map((m) => m.total), monthlyAverage ?? 0, 0);

  if (max <= 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium">Ultimele 12 luni</h2>
        <p className="text-muted-foreground text-sm">Nicio cheltuială în ultimele 12 luni.</p>
      </div>
    );
  }

  const slotWidth = VB_WIDTH / monthTotals.length;
  const barWidth = Math.min(slotWidth * 0.55, 14);
  const averageY =
    monthlyAverage !== null ? BASELINE_Y - (monthlyAverage / max) * MAX_BAR_HEIGHT : null;

  const biggestIndex = monthTotals.reduce(
    (best, m, i) => (m.total > monthTotals[best].total ? i : best),
    0,
  );
  const labelIndex = activeIndex ?? biggestIndex;
  const labelMonth = monthTotals[labelIndex];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Ultimele 12 luni</h2>
        {monthlyAverage !== null && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
            <span className="bg-muted-foreground/50 h-px w-3" />
            medie {Math.round(monthlyAverage)} lei
          </span>
        )}
      </div>

      <div className="relative">
        <div
          className="text-foreground pointer-events-none absolute top-0 text-[10px] font-medium whitespace-nowrap tabular-nums"
          style={{
            left: `${((labelIndex + 0.5) / monthTotals.length) * 100}%`,
            transform: `translateX(${labelIndex > monthTotals.length * 0.7 ? '-85%' : '-50%'})`,
          }}
        >
          {labelMonth.total.toFixed(2)} lei
          <span className="text-muted-foreground font-normal">
            {' '}
            · {monthKeyLabel(labelMonth.month)}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          className="h-32 w-full"
          role="img"
          aria-label="Cheltuieli lunare în ultimele 12 luni"
        >
          <line
            x1={0}
            y1={BASELINE_Y}
            x2={VB_WIDTH}
            y2={BASELINE_Y}
            className="stroke-border"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {averageY !== null && (
            <line
              x1={0}
              y1={averageY}
              x2={VB_WIDTH}
              y2={averageY}
              className="stroke-muted-foreground/50"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {monthTotals.map((m, i) => {
            const rawHeight = (m.total / max) * MAX_BAR_HEIGHT;
            const height = m.total > 0 ? Math.max(rawHeight, MIN_VISIBLE_HEIGHT) : 0;
            const x = i * slotWidth + (slotWidth - barWidth) / 2;
            const isPartial = m.month === currentMonth;
            const isActive = i === activeIndex;

            return (
              <g key={m.month}>
                {/* The live month is hatched rather than solid: it is a
                    part-month next to full ones, and drawn the same it would
                    read as a genuine drop every time the 1st comes around. */}
                <rect
                  x={x}
                  y={BASELINE_Y - height}
                  width={barWidth}
                  height={height}
                  rx={1.5}
                  className={
                    isActive
                      ? 'fill-foreground'
                      : isPartial
                        ? 'fill-foreground/35'
                        : 'fill-foreground/70'
                  }
                />
                <rect
                  x={i * slotWidth}
                  y={0}
                  width={slotWidth}
                  height={VB_HEIGHT}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${monthKeyLabel(m.month)}: ${m.total.toFixed(2)} lei${
                    isPartial ? ' (lună în curs)' : ''
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex((current) => (current === i ? null : i))}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="text-muted-foreground flex text-[10px] tabular-nums">
        {monthTotals.map((m, i) => (
          <span key={m.month} className="flex-1 text-center">
            {/* Every other label, so twelve of them do not collide on a phone. */}
            {i % 2 === 0 ? monthKeyShortLabel(m.month) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
