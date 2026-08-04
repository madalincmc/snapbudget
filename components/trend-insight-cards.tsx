import type * as React from 'react';
import { CalendarDays, Crown, Flame, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { BiggestExpense, CategoryTotal, DailySpend } from '@/lib/dashboard/aggregate';
import { formatDayLabel } from '@/lib/dashboard/format';

function InsightCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {icon}
          <span>{label}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function TrendInsightCards({
  topCategory,
  biggestExpense,
  avgDailySpend,
  highestSpendingDay,
}: {
  topCategory: CategoryTotal | null;
  biggestExpense: BiggestExpense | null;
  avgDailySpend: number;
  highestSpendingDay: DailySpend | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <InsightCard icon={<Crown className="h-3.5 w-3.5" />} label="Categorie principală">
        {topCategory ? (
          <>
            <p className="text-foreground truncate text-sm font-medium">{topCategory.category}</p>
            <p className="text-foreground text-lg font-semibold tabular-nums">
              {topCategory.total.toFixed(2)} lei
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Fără date</p>
        )}
      </InsightCard>

      <InsightCard icon={<Receipt className="h-3.5 w-3.5" />} label="Cea mai mare cheltuială">
        {biggestExpense ? (
          <>
            <p className="text-foreground truncate text-sm font-medium">{biggestExpense.merchant}</p>
            <p className="text-foreground text-lg font-semibold tabular-nums">
              {biggestExpense.amount.toFixed(2)} lei
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Fără date</p>
        )}
      </InsightCard>

      <InsightCard icon={<CalendarDays className="h-3.5 w-3.5" />} label="Medie zilnică">
        <p className="text-foreground text-lg font-semibold tabular-nums">
          {avgDailySpend.toFixed(2)} lei
        </p>
      </InsightCard>

      <InsightCard icon={<Flame className="h-3.5 w-3.5" />} label="Cea mai scumpă zi">
        {highestSpendingDay && highestSpendingDay.total > 0 ? (
          <>
            <p className="text-foreground truncate text-sm font-medium">
              {formatDayLabel(highestSpendingDay.date)}
            </p>
            <p className="text-foreground text-lg font-semibold tabular-nums">
              {highestSpendingDay.total.toFixed(2)} lei
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Fără date</p>
        )}
      </InsightCard>
    </div>
  );
}
