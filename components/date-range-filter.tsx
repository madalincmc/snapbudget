'use client';

import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ALL_PERIODS_LABEL,
  PERIOD_LABELS,
  PRESET_PERIODS,
  describeDateRange,
  isDateKey,
  type DateFilter,
} from '@/lib/history/date-range';

/**
 * The period the history list is scoped to: five presets, or an interval the
 * reader picks themselves.
 *
 * A popover rather than a select, because a custom interval needs two inputs
 * and a select can only hold a list. Those inputs are native `type="date"`:
 * that gets the platform's own picker on a phone, which beats anything a
 * hand-rolled calendar would manage in the same amount of code.
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

  function choose(next: DateFilter) {
    onValueChange(next);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Reopening shows what is actually applied, not whichever half-typed
        // interval was abandoned last time.
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

      <PopoverContent align="start" className="w-72">
        <div className="flex flex-col gap-0.5">
          {PRESET_PERIODS.map((period) => (
            <Button
              key={period}
              variant={value.period === period ? 'secondary' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => choose({ period })}
            >
              {PERIOD_LABELS[period]}
            </Button>
          ))}
        </div>

        <div className="border-border flex flex-col gap-2 border-t pt-2.5">
          <p className="text-muted-foreground text-xs">Interval personalizat</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="range-from" className="text-muted-foreground text-xs font-normal">
                De la
              </Label>
              <Input
                id="range-from"
                type="date"
                value={from}
                max={isDateKey(to) ? to : undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="range-to" className="text-muted-foreground text-xs font-normal">
                Până la
              </Label>
              <Input
                id="range-to"
                type="date"
                value={to}
                min={isDateKey(from) ? from : undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          {/* One end is enough — "everything since 1 March" is a period too. */}
          <Button
            size="sm"
            disabled={!isDateKey(from) && !isDateKey(to)}
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
          <div className="border-border flex flex-col border-t pt-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
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
