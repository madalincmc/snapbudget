'use client';

import type * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ColumnPoint {
  /** Stable identity — the date or month key. */
  key: string;
  value: number;
  /** Read out in the tooltip and the table twin. */
  label: string;
  /**
   * De-emphasised. The trailing-30-day window spans two calendar months, and
   * the twelve-month chart ends on a month that is not over yet; in both cases
   * the odd-one-out is drawn lighter so it is not read as a genuine drop.
   */
  muted?: boolean;
  /** Suffix appended to this column's tooltip, e.g. "lună în curs". */
  note?: string;
}

interface ColumnChartProps {
  points: ColumnPoint[];
  /** Reference line, e.g. the monthly average. Null hides it. */
  average?: number | null;
  averageLabel?: string;
  /** Names the plot for the table twin's caption. */
  caption: string;
  /**
   * Formatting is a decimals count and a unit rather than a formatter
   * function: every caller is a server component, and a function prop cannot
   * cross that boundary — it fails at render, not at type-check.
   */
  decimals?: number;
  unit?: string;
  /** Tailwind height for the plot band, excluding the axis row beneath it. */
  plotHeight?: string;
  /** Columns are capped at this width so 12 of them do not become slabs. */
  maxBarWidth?: number;
  /** Axis row under the plot — the caller knows which ticks are worth showing. */
  axis?: React.ReactNode;
  className?: string;
}

/** Thousands separated by a thin space — "2 767.77" scans faster than "2767.77". */
function money(value: number, decimals: number, unit: string): string {
  const [whole, fraction] = value.toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${fraction ? `${grouped}.${fraction}` : grouped} ${unit}`;
}

/** Three horizontal hairlines behind the plot, at 25/50/75% of the scale. */
function Gridlines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[0.25, 0.5, 0.75].map((fraction) => (
        <div
          key={fraction}
          className="bg-chart-grid absolute inset-x-0 h-px"
          style={{ bottom: `${fraction * 100}%` }}
        />
      ))}
    </div>
  );
}

/**
 * One column chart for both the daily and the monthly view.
 *
 * Built from positioned boxes rather than an SVG viewBox. A viewBox with the
 * default `preserveAspectRatio` letterboxes itself inside a fixed-height,
 * fluid-width card — the plot never actually spans the card — and every
 * rounded cap has to be drawn in user units that no longer match device
 * pixels. Boxes give the 2px surface gap and the 4px cap in real pixels at any
 * width, and let the growth animation run on the compositor.
 *
 * The plot itself is aria-hidden; the values are carried by the visually
 * hidden table below it, so a tooltip is never the only way to read a number.
 */
export function ColumnChart({
  points,
  average = null,
  averageLabel,
  caption,
  decimals = 2,
  unit = 'lei',
  plotHeight = 'h-32',
  maxBarWidth = 14,
  axis,
  className,
}: ColumnChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // The average line can sit above every column — one big month early on drags
  // it up — so the scale has to accommodate it or it would be clipped away.
  const max = Math.max(...points.map((p) => p.value), average ?? 0, 0);

  const peakIndex = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  // With nothing hovered the extreme carries the direct label: the one value
  // worth naming without being asked. A number over every column is noise.
  const labelIndex = activeIndex ?? peakIndex;
  const labelled = points[labelIndex];

  const averagePercent = average !== null && max > 0 ? (average / max) * 100 : null;

  function move(delta: number) {
    setActiveIndex((current) => {
      const next = (current ?? peakIndex) + delta;
      return Math.min(Math.max(next, 0), points.length - 1);
    });
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative">
        {/* Direct label. Anchored to the column's centre and flipped near the
            right edge so it never runs off the card. */}
        <div
          className="pointer-events-none absolute -top-0.5 z-10 text-[11px] leading-none font-medium whitespace-nowrap"
          style={{
            left: `${((labelIndex + 0.5) / points.length) * 100}%`,
            transform: `translateX(${labelIndex > points.length * 0.7 ? '-88%' : '-50%'})`,
          }}
        >
          <span className="text-foreground tabular-nums">
            {money(labelled.value, decimals, unit)}
          </span>
          <span className="text-muted-foreground font-normal"> · {labelled.label}</span>
        </div>

        <div
          role="group"
          tabIndex={0}
          aria-label={`${caption}. Folosește săgețile pentru a parcurge valorile.`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              move(1);
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              move(-1);
            } else if (event.key === 'Escape') {
              setActiveIndex(null);
            }
          }}
          onBlur={() => setActiveIndex(null)}
          onPointerLeave={() => setActiveIndex(null)}
          className={cn(
            'focus-visible:ring-ring/40 relative mt-5 flex items-end rounded-md focus-visible:ring-2 focus-visible:outline-none',
            plotHeight,
          )}
        >
          <Gridlines />

          {averagePercent !== null && (
            <div
              aria-hidden
              className="border-muted-foreground/45 pointer-events-none absolute inset-x-0 border-t border-dashed"
              style={{ bottom: `${averagePercent}%` }}
            />
          )}

          {points.map((point, index) => {
            const percent = max > 0 ? (point.value / max) * 100 : 0;
            const active = index === activeIndex;

            return (
              <div
                key={point.key}
                // The hit target is the whole slot, full height — a 4px-wide
                // column is not something a thumb can be asked to land on.
                onPointerEnter={() => setActiveIndex(index)}
                onPointerDown={() => setActiveIndex(index)}
                className="group/col relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center px-[1px]"
              >
                <div
                  className={cn(
                    // rounded-t only: the cap is rounded, the baseline is
                    // square, so every column is anchored to the same line.
                    'sb-column w-full rounded-t-[4px] transition-[filter,opacity] duration-200',
                    active
                      ? 'brightness-110 saturate-125'
                      : 'group-hover/col:brightness-110 group-hover/col:saturate-125',
                    point.muted
                      ? 'bg-chart-accent/30'
                      : 'from-chart-accent-soft to-chart-accent bg-linear-to-t',
                  )}
                  style={
                    {
                      '--sb-h': `${point.value > 0 ? Math.max(percent, 1.5) : 0}%`,
                      '--sb-delay': `${Math.min(index * 12, 400)}ms`,
                      maxWidth: maxBarWidth,
                    } as React.CSSProperties
                  }
                />

                {active && (
                  <div
                    aria-hidden
                    className="bg-foreground/60 pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {axis}

      {averageLabel && averagePercent !== null && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] tabular-nums">
          <span className="border-muted-foreground/45 w-4 border-t border-dashed" aria-hidden />
          {averageLabel}
        </p>
      )}

      {/* The table twin. Same numbers, no colour and no pointer required. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Perioadă</th>
            <th scope="col">Sumă</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">
                {point.label}
                {point.note ? ` (${point.note})` : ''}
              </th>
              <td>{money(point.value, decimals, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
