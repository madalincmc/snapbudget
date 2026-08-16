'use client';

import { useState, type MouseEvent } from 'react';
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
/**
 * Opens the platform's date picker on a click anywhere in the field.
 *
 * A native date input only opens its picker from the small icon at its trailing
 * edge; clicking the value itself just puts the caret in a segment to be typed
 * over. That is a fiddly target, and typing a date is not what anyone came here
 * to do — so the whole field becomes the button that opens the picker.
 *
 * Reached by keyboard the field still takes a typed date, since this hangs off
 * the click alone.
 */
function openPicker(event: MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== 'function') return;

  try {
    input.showPicker();
  } catch {
    // Throws when the picker is already open — clicking the native icon opens
    // it too — and on browsers that have none to show. Typing still works.
  }
}

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

      {/* As wide as a phone will take, capped to the viewport so it cannot be
          pushed off the side of a narrow one. The width is here for the date
          fields below: how much a native date control needs is the platform's
          business, not ours, so the answer is to leave it room rather than to
          budget it. */}
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
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

        <div className="border-border flex flex-col gap-2.5 border-t pt-2.5">
          <p className="text-muted-foreground text-xs">Interval personalizat</p>

          {/* Each field gets the popover's full width, with its label above.
              A native date control renders its value and picker icon in shadow
              DOM that does not shrink to the box around it, and how much it
              needs depends on the platform's date format and font — so it is
              given all the room there is rather than a share worked out against
              one device. Beside the label it had 235px, and the internals still
              spilled past the popover edge on a phone.

              px-2 rather than the input default: a few more pixels inside the
              box are worth more here than the symmetry. */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="range-from" className="text-muted-foreground text-xs font-normal">
              De la
            </Label>
            <Input
              id="range-from"
              type="date"
              className="px-2"
              value={from}
              max={isDateKey(to) ? to : undefined}
              onClick={openPicker}
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
              className="px-2"
              value={to}
              min={isDateKey(from) ? from : undefined}
              onClick={openPicker}
              onChange={(e) => setTo(e.target.value)}
            />
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
