import { ColumnChart, type ColumnPoint } from '@/components/charts/column-chart';
import { formatDayLabel, trendHeading } from '@/lib/dashboard/format';
import type { DailySpend, DashboardPeriod } from '@/lib/dashboard/aggregate';

export function SpendingTrendChart({
  data,
  period,
}: {
  data: DailySpend[];
  period: DashboardPeriod;
}) {
  const heading = trendHeading(period);
  // Only a live month charts a window wider than the period itself — a
  // trailing thirty days that reaches back over the month boundary. Everything
  // else charts exactly the days it is about.
  const isTrailing = period.kind === 'month' && period.isLive;

  const max = Math.max(...data.map((d) => d.total), 0);
  if (max <= 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {heading}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isTrailing
            ? 'Nicio cheltuială în ultimele 30 de zile.'
            : 'Nicio cheltuială în această perioadă.'}
        </p>
      </div>
    );
  }

  const todayIndex = data.length - 1;
  // A trailing window spans two calendar months, so days belonging to the
  // earlier one are drawn lighter: without that split the chart's own total
  // looks like it contradicts the month total above it. A single month needs
  // no such split, so every column there is a full-weight one.
  const selectedMonth = isTrailing ? data[todayIndex].date.slice(0, 7) : null;

  // Days with no spending are real zeroes, not gaps, so the mean is over the
  // whole window — that is what "per day" means on the card above.
  const average = data.reduce((sum, d) => sum + d.total, 0) / data.length;

  const points: ColumnPoint[] = data.map((d, index) => ({
    key: d.date,
    value: d.total,
    label: period.isLive && index === todayIndex ? 'azi' : formatDayLabel(d.date),
    muted: selectedMonth !== null && d.date.slice(0, 7) !== selectedMonth,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {heading}
        </h2>
        {/* The two-month legend only means something for a trailing window. */}
        {isTrailing && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <span className="bg-chart-accent/30 h-2 w-2 rounded-[2px]" />
            {formatDayLabel(data[0].date).split(' ')[1]}
            <span className="bg-chart-accent ml-1 h-2 w-2 rounded-[2px]" />
            {formatDayLabel(data[todayIndex].date).split(' ')[1]}
          </span>
        )}
      </div>

      <ColumnChart
        points={points}
        average={average}
        averageLabel={`medie ${Math.round(average)} lei/zi`}
        caption={`Cheltuieli zilnice — ${heading.toLowerCase()}`}
        plotHeight="h-28"
        maxBarWidth={9}
        axis={
          <div
            key="axis"
            className="text-muted-foreground flex justify-between text-[10px] tabular-nums"
          >
            <span>{formatDayLabel(data[0].date)}</span>
            <span>{formatDayLabel(data[Math.floor((data.length - 1) / 2)].date)}</span>
            <span>{period.isLive ? 'Azi' : formatDayLabel(data[todayIndex].date)}</span>
          </div>
        }
      />
    </div>
  );
}
