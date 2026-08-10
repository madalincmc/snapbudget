'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { monthKeyLabel } from '@/lib/dashboard/format';
import { shiftMonthKey, type MonthKey } from '@/lib/dashboard/aggregate';

/**
 * Arrows rather than a dropdown: stepping to "last month" is by far the common
 * move and costs one tap, and there is no list length to grow as history does.
 * The forward arrow stops at the current month — there is nothing to show past
 * today, and a disabled control says so better than an empty screen would.
 */
export function MonthPicker({ month, currentMonth }: { month: MonthKey; currentMonth: MonthKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isCurrent = month === currentMonth;

  function goTo(target: MonthKey) {
    const params = new URLSearchParams(searchParams.toString());
    // The current month is the default, so it stays out of the URL entirely.
    if (target === currentMonth) {
      params.delete('month');
    } else {
      params.set('month', target);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        onClick={() => goTo(shiftMonthKey(month, -1))}
      >
        <ChevronLeft />
        <span className="sr-only">Luna anterioară</span>
      </Button>

      <span className="text-foreground min-w-24 text-center text-sm font-medium capitalize">
        {isCurrent ? 'Luna aceasta' : monthKeyLabel(month)}
      </span>

      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        disabled={isCurrent}
        onClick={() => goTo(shiftMonthKey(month, 1))}
      >
        <ChevronRight />
        <span className="sr-only">Luna următoare</span>
      </Button>
    </div>
  );
}
