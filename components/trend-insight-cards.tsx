import type * as React from 'react';
import { Crown, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CATEGORY_BAR_CLASS } from '@/lib/categories';
import type { BiggestExpense, CategoryTotal } from '@/lib/dashboard/aggregate';

function InsightCard({
  icon,
  label,
  title,
  amount,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  title: string | null;
  amount: number | null;
  accent?: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1.5">
        <div className="text-muted-foreground/80 flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        {title === null || amount === null ? (
          <p className="text-muted-foreground/70 pt-1 text-sm">—</p>
        ) : (
          <>
            <p className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
              {accent}
              <span className="truncate">{title}</span>
            </p>
            <p className="text-foreground text-lg leading-tight font-semibold tracking-tight">
              {amount.toFixed(2)}
              <span className="text-muted-foreground/70 text-xs font-normal"> lei</span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Two tiles, not four. "Cea mai scumpă zi" duplicated the peak the trend chart
 * already direct-labels, and the daily average now sits under the month total
 * where it reads as context rather than as a competing metric.
 */
export function TrendInsightCards({
  topCategory,
  biggestExpense,
}: {
  topCategory: CategoryTotal | null;
  biggestExpense: BiggestExpense | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <InsightCard
        icon={<Crown className="h-3.5 w-3.5" />}
        label="Top categorie"
        title={topCategory?.category ?? null}
        amount={topCategory?.total ?? null}
        accent={
          topCategory ? (
            <span
              className={`h-2.5 w-2.5 flex-none rounded-full ${CATEGORY_BAR_CLASS[topCategory.category]}`}
            />
          ) : null
        }
      />
      <InsightCard
        icon={<Receipt className="h-3.5 w-3.5" />}
        label="Cheltuiala maximă"
        title={biggestExpense?.merchant ?? null}
        amount={biggestExpense?.amount ?? null}
      />
    </div>
  );
}
