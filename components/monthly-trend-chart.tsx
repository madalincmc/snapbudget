import { ColumnChart, type ColumnPoint } from '@/components/charts/column-chart';
import { monthKeyLabel, monthKeyShortLabel } from '@/lib/dashboard/format';
import type { MonthTotal } from '@/lib/analytics';

export function MonthlyTrendChart({
  monthTotals,
  monthlyAverage,
  currentMonth,
}: {
  monthTotals: MonthTotal[];
  monthlyAverage: number | null;
  currentMonth: string;
}) {
  const max = Math.max(...monthTotals.map((m) => m.total), monthlyAverage ?? 0, 0);

  if (max <= 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Ultimele 12 luni
        </h2>
        <p className="text-muted-foreground text-sm">Nicio cheltuială în ultimele 12 luni.</p>
      </div>
    );
  }

  const points: ColumnPoint[] = monthTotals.map((m) => ({
    key: m.month,
    value: m.total,
    label: monthKeyLabel(m.month),
    // The live month is a part-month standing next to full ones; drawn at the
    // same weight it would read as a genuine drop every time the 1st comes
    // round.
    muted: m.month === currentMonth,
    note: m.month === currentMonth ? 'lună în curs' : undefined,
  }));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Ultimele 12 luni
      </h2>

      <ColumnChart
        points={points}
        average={monthlyAverage}
        averageLabel={
          monthlyAverage === null
            ? undefined
            : `medie ${Math.round(monthlyAverage)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} lei/lună`
        }
        caption="Cheltuieli lunare în ultimele 12 luni"
        decimals={0}
        plotHeight="h-32"
        maxBarWidth={18}
        axis={
          <div className="text-muted-foreground flex text-[10px] tabular-nums">
            {monthTotals.map((m, i) => (
              <span key={m.month} className="flex-1 text-center">
                {/* Every other label, so twelve of them do not collide on a phone. */}
                {i % 2 === 0 ? monthKeyShortLabel(m.month) : ''}
              </span>
            ))}
          </div>
        }
      />
    </div>
  );
}
