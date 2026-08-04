'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FREQUENCIES, FREQUENCY_LABEL, type Frequency } from '@/lib/recurring';

/** Mirrors CategoryPicker: a styled Select backed by a hidden input, so the
 *  value reaches the server action through plain FormData. */
export function FrequencyPicker({ defaultValue = 'monthly' }: { defaultValue?: Frequency }) {
  const [value, setValue] = useState<Frequency>(defaultValue);

  return (
    <>
      <input type="hidden" name="frequency" value={value} />
      <Select
        items={FREQUENCY_LABEL}
        value={value}
        onValueChange={(next) => setValue((next as Frequency) ?? 'monthly')}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Frecvență" />
        </SelectTrigger>
        <SelectContent>
          {FREQUENCIES.map((f) => (
            <SelectItem key={f} value={f}>
              {FREQUENCY_LABEL[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
