'use client';

import { useState } from 'react';
import { formatDayLabel } from '@/lib/dashboard/format';
import type { DailySpend } from '@/lib/dashboard/aggregate';

const VB_WIDTH = 300;
const VB_HEIGHT = 100;
const TOP_PAD = 16;
const BASELINE_Y = 92;
const MAX_BAR_HEIGHT = BASELINE_Y - TOP_PAD;
const MIN_VISIBLE_HEIGHT = 3;

export function SpendingTrendChart({ data }: { data: DailySpend[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.total), 0);
  if (max <= 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-medium">Ultimele 30 de zile</h2>
        <p className="text-muted-foreground text-sm">Nicio cheltuială în ultimele 30 de zile.</p>
      </div>
    );
  }

  const todayIndex = data.length - 1;
  // The window spans two calendar months, so the bars are shaded by month:
  // without that split the chart's own total looks like it contradicts the
  // month total above it. "Current" is whichever month today falls in.
  const currentMonth = data[todayIndex].date.slice(0, 7);
  const maxIndex = data.reduce((best, d, i) => (d.total > data[best].total ? i : best), 0);
  const labelIndex = activeIndex ?? maxIndex;
  const labelDay = data[labelIndex];

  const slotWidth = VB_WIDTH / data.length;
  const barWidth = Math.min(slotWidth * 0.6, 8);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Ultimele 30 de zile</h2>
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="bg-foreground/25 h-2 w-2 rounded-[2px]" />
          {formatDayLabel(data[0].date).split(' ')[1]}
          <span className="bg-foreground ml-1 h-2 w-2 rounded-[2px]" />
          {formatDayLabel(data[todayIndex].date).split(' ')[1]}
        </span>
      </div>

      <div className="relative">
        <div
          className="text-foreground pointer-events-none absolute top-0 text-[10px] font-medium whitespace-nowrap tabular-nums"
          style={{
            left: `${((labelIndex + 0.5) / data.length) * 100}%`,
            transform: `translateX(${labelIndex > data.length * 0.7 ? '-85%' : '-50%'})`,
          }}
        >
          {labelDay.total.toFixed(2)} lei
          <span className="text-muted-foreground font-normal">
            {' '}
            · {labelIndex === todayIndex ? 'azi' : formatDayLabel(labelDay.date)}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          className="h-28 w-full"
          role="img"
          aria-label="Cheltuieli zilnice în ultimele 30 de zile"
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
          {data.map((d, i) => {
            const rawHeight = (d.total / max) * MAX_BAR_HEIGHT;
            const height = d.total > 0 ? Math.max(rawHeight, MIN_VISIBLE_HEIGHT) : 0;
            const x = i * slotWidth + (slotWidth - barWidth) / 2;
            const isCurrentMonth = d.date.slice(0, 7) === currentMonth;
            const isActive = i === activeIndex || i === todayIndex;

            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={BASELINE_Y - height}
                  width={barWidth}
                  height={height}
                  rx={1.5}
                  className={
                    isActive
                      ? 'fill-foreground'
                      : isCurrentMonth
                        ? 'fill-foreground/60'
                        : 'fill-foreground/25'
                  }
                />
                {/* Larger, transparent hit target so thin bars stay tappable on mobile. */}
                <rect
                  x={i * slotWidth}
                  y={0}
                  width={slotWidth}
                  height={VB_HEIGHT}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatDayLabel(d.date)}: ${d.total.toFixed(2)} lei`}
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

      <div className="text-muted-foreground flex justify-between text-[10px] tabular-nums">
        <span>{formatDayLabel(data[0].date)}</span>
        <span>{formatDayLabel(data[Math.floor((data.length - 1) / 2)].date)}</span>
        <span>Azi</span>
      </div>
    </div>
  );
}
