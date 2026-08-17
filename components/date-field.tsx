'use client';

import { type MouseEvent } from 'react';
import { formatListDate } from '@/lib/dashboard/format';
import { isDateKey } from '@/lib/history/date-range';
import { cn } from '@/lib/utils';

/**
 * Opens the platform's date picker.
 *
 * A native date input only opens its picker from the small icon at its
 * trailing edge, and typing a date is not what anyone opened a filter to do —
 * so the whole row is made to open it instead.
 */
export function openPicker(event: MouseEvent<HTMLInputElement>) {
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
 * One end of a date range: a label, the date as we draw it, and the native
 * control stretched invisibly across the row.
 *
 * The input is here for its picker and nothing else. Taken out of the layout
 * entirely, its intrinsic width — which it will not shrink below, and which
 * varies with the platform's date format — stops dictating how wide the panel
 * around it has to be. Drawing the value ourselves is also what keeps it
 * reading "15 aug" rather than the browser's mm/dd/yyyy.
 *
 * Shared by the history filter and the dashboard's period picker so the two
 * behave identically.
 */
export function DateField({
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
