'use client';

import { useState, type MouseEvent } from 'react';
import { CalendarRange, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatListDate } from '@/lib/dashboard/format';
import { cn } from '@/lib/utils';
import {
  ALL_PERIODS_LABEL,
  PERIOD_LABELS,
  PRESET_PERIODS,
  describeDateRange,
  isDateKey,
  type DateFilter,
} from '@/lib/history/date-range';

/**
 * Opens the platform's date picker.
 *
 * A native date input only opens its picker from the small icon at its trailing
 * edge, and typing a date is not what anyone opened a filter to do — so the
 * whole row is made to open it instead.
 */
function openPicker(event: MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== 'function') return;

  try {
    input.showPicker();
  } catch {
    // Throws when the picker is already open and on browsers that have none.
    // Neither is worth breaking the tap over.
  }
}

/**
 * One end of the custom interval.
 *
 * The native control is here for its picker and nothing else: it is stretched
 * invisibly across the whole row, so a tap anywhere opens the platform's
 * calendar, while the date the reader sees is drawn by us. That is what keeps
 * "15 aug" from being `mm/dd/yyyy` in a Romanian app — and, because the input
 * is taken out of the layout entirely, what stops its intrinsic width from
 * dictating how wide this popover has to be. Sizing the panel around that
 * width is what made the fields overlap and then overhang on a phone.
 */
function DateRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  const chosen = isDateKey(value);

  return (
    <label className="focus-within:bg-muted/60 hover:bg-muted/40 relative flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition-colors">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          'truncate text-sm font-medium',
          chosen ? 'text-foreground' : 'text-muted-foreground/60',
        )}
      >
        {chosen ? formatListDate(value) : 'Alege data'}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onClick={openPicker}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

/**
 * The period the history list is scoped to: one of five named stretches, or an
 * interval the reader draws themselves.
 *
 * A popover rather than a select, because a select can only hold a list and the
 * custom interval needs two controls of its own. Everything inside it is a row
 * in a group — the presets, then the two ends of the interval — so the panel
 * reads as one thing rather than a menu with a form bolted underneath.
 */
export function DateRangeFilter({
  value,
  onValueChange,
}: {
  value: DateFilter;
  onValueChange: (value: DateFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from ?? '');
  const [to, setTo] = useState(value.to ?? '');

  const active = value.period !== 'all';
  const canApply = isDateKey(from) || isDateKey(to);

  function choose(next: DateFilter) {
    onValueChange(next);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Reopening shows what is applied, not whichever half-drawn interval
        // was abandoned last time.
        if (next) {
          setFrom(value.period === 'custom' ? (value.from ?? '') : '');
          setTo(value.period === 'custom' ? (value.to ?? '') : '');
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" size="lg" className="w-auto flex-none whitespace-nowrap">
            <CalendarRange />
            {active ? describeDateRange(value) : 'Perioadă'}
          </Button>
        }
      />

      {/* Capped to the viewport so the panel cannot hang off the side of a
          narrow screen. The underscores matter: calc() needs whitespace around
          a binary minus, and Tailwind only adds it for a bare calc() — nested
          inside min() the mistake reaches the stylesheet, where an invalid
          value silently drops the whole declaration. */}
      <PopoverContent
        align="start"
        className="w-[20rem] max-w-[calc(100vw_-_2rem)] gap-0 overflow-hidden p-0"
      >
        <div className="flex flex-col p-1.5">
          {PRESET_PERIODS.map((period) => (
            <Button
              key={period}
              variant="ghost"
              size="lg"
              className="w-full justify-between font-normal"
              onClick={() => choose({ period })}
            >
              <span className="truncate">{PERIOD_LABELS[period]}</span>
              {value.period === period && <Check className="text-primary" />}
            </Button>
          ))}
        </div>

        <div className="border-border flex flex-col gap-2 border-t p-2.5">
          <p className="text-muted-foreground px-0.5 text-xs">Interval personalizat</p>

          {/* Both ends in one bordered group rather than two loose fields: it
              is a single interval, and the two rows stacked keep every width
              question out of it. */}
          <div className="border-input divide-border divide-y overflow-hidden rounded-lg border">
            <DateRow
              label="De la"
              value={from}
              max={isDateKey(to) ? to : undefined}
              onChange={setFrom}
            />
            <DateRow
              label="Până la"
              value={to}
              min={isDateKey(from) ? from : undefined}
              onChange={setTo}
            />
          </div>

          {/* One end is enough — "everything since 1 March" is a period too. */}
          <Button
            size="lg"
            disabled={!canApply}
            onClick={() =>
              choose({
                period: 'custom',
                from: isDateKey(from) ? from : undefined,
                to: isDateKey(to) ? to : undefined,
              })
            }
          >
            Aplică intervalul
          </Button>
        </div>

        {active && (
          <div className="border-border border-t p-1.5">
            <Button
              variant="ghost"
              size="lg"
              className="text-muted-foreground w-full font-normal"
              onClick={() => choose({ period: 'all' })}
            >
              {ALL_PERIODS_LABEL}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
