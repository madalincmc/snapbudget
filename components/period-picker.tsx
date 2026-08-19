'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateField } from '@/components/date-field';
import { monthKeyLabel, periodLabel } from '@/lib/dashboard/format';
import { shiftMonthKey, type DashboardPeriod, type MonthKey } from '@/lib/dashboard/aggregate';
import { MAX_CUSTOM_DAYS } from '@/lib/dashboard/period';
import { isDateKey, PERIOD_LABELS, resolveDateRange } from '@/lib/history/date-range';

/** The presets short enough to always fit inside the chart's day limit. */
const QUICK_RANGE_PERIODS = ['today', 'last_7', 'last_30'] as const;

/**
 * Which stretch of time the dashboard is describing.
 *
 * Months keep the arrows they had — stepping to last month is the common move
 * and costs one tap — and the interval sits behind them for the times the
 * question is about a holiday or a fortnight rather than a calendar month.
 * Both write the same URL the page reads back, so the period survives a
 * reload, a share, and the trip out to a category and back.
 */
export function PeriodPicker({
  period,
  currentMonth,
}: {
  period: DashboardPeriod;
  currentMonth: MonthKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(period.kind === 'custom' ? period.from : '');
  const [to, setTo] = useState(period.kind === 'custom' ? period.to : '');

  const isCurrent = period.month === currentMonth;

  /** Every navigation from here keeps the rest of the view — notably `who`. */
  function go(next: { month?: MonthKey | null; from?: string | null; to?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      // The current month is the default, so it stays out of the URL entirely —
      // a link carrying it would stop being right at midnight on the first.
      if (!value || (key === 'month' && value === currentMonth)) params.delete(key);
      else params.set(key, value);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  function goToMonth(month: MonthKey) {
    go({ month, from: null, to: null });
  }

  function goToQuickRange(quickPeriod: (typeof QUICK_RANGE_PERIODS)[number]) {
    const range = resolveDateRange({ period: quickPeriod });
    if (!range?.from || !range.to) return;
    go({ from: range.from, to: range.to, month: null });
  }

  if (period.kind === 'custom') {
    return (
      <div className="bg-muted/70 ring-border/60 flex items-center gap-1 rounded-full py-0.5 pr-0.5 pl-3 ring-1">
        <CalendarRange className="text-muted-foreground size-3.5 flex-none" />
        <span className="text-foreground text-sm font-medium">{periodLabel(period)}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-card rounded-full"
          onClick={() => goToMonth(currentMonth)}
        >
          <X />
          <span className="sr-only">Înapoi la luna aceasta</span>
        </Button>
      </div>
    );
  }

  const month = period.month ?? currentMonth;

  return (
    <div className="bg-muted/70 ring-border/60 flex items-center gap-0.5 rounded-full p-0.5 ring-1">
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:bg-card rounded-full transition-transform active:scale-90"
        onClick={() => goToMonth(shiftMonthKey(month, -1))}
      >
        <ChevronLeft />
        <span className="sr-only">Luna anterioară</span>
      </Button>

      {/* first-letter, not `capitalize`: the latter title-cases every word, so
          "Luna aceasta" came out "Luna Aceasta" — wrong in Romanian, where
          only the first word of a phrase takes a capital. */}
      <span className="text-foreground min-w-28 text-center text-sm font-medium first-letter:uppercase">
        {isCurrent ? 'Luna aceasta' : monthKeyLabel(month)}
      </span>

      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:bg-card rounded-full transition-transform active:scale-90 disabled:opacity-30"
        disabled={isCurrent}
        onClick={() => goToMonth(shiftMonthKey(month, 1))}
      >
        <ChevronRight />
        <span className="sr-only">Luna următoare</span>
      </Button>

      <Popover
        open={open}
        onOpenChange={(next) => {
          // Reopening offers the period in view, not a half-drawn one left over.
          if (next) {
            setFrom(period.kind === 'custom' ? period.from : '');
            setTo(period.kind === 'custom' ? period.to : '');
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-card rounded-full"
            >
              <CalendarRange />
              <span className="sr-only">Alege un interval</span>
            </Button>
          }
        />

        <PopoverContent
          align="end"
          className="w-[20rem] max-w-[calc(100vw_-_2rem)] gap-0 overflow-hidden p-0"
        >
          <div className="flex flex-col p-1.5">
            {QUICK_RANGE_PERIODS.map((quickPeriod) => (
              <Button
                key={quickPeriod}
                variant="ghost"
                size="lg"
                className="w-full justify-start font-normal"
                onClick={() => goToQuickRange(quickPeriod)}
              >
                {PERIOD_LABELS[quickPeriod]}
              </Button>
            ))}
          </div>

          <div className="border-border flex flex-col gap-2.5 border-t p-2.5">
            <p className="text-muted-foreground px-0.5 text-xs">Interval personalizat</p>

            <div className="border-input divide-border divide-y overflow-hidden rounded-lg border">
              <DateField
                label="De la"
                value={from}
                max={isDateKey(to) ? to : undefined}
                onChange={setFrom}
              />
              <DateField
                label="Până la"
                value={to}
                min={isDateKey(from) ? from : undefined}
                onChange={setTo}
              />
            </div>

            {/* Both ends, unlike the history filter: every figure here is measured
                per day and compared against the stretch before, and neither means
                anything without a length. */}
            <Button
              size="lg"
              disabled={!isDateKey(from) || !isDateKey(to)}
              onClick={() => go({ from, to, month: null })}
            >
              Aplică intervalul
            </Button>

            <p className="text-muted-foreground px-0.5 text-[11px]">
              Cel mult {MAX_CUSTOM_DAYS} de zile — peste atât, graficul zilnic nu mai poate fi
              citit.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
