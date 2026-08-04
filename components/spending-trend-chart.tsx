import type { DailySpend } from '@/lib/dashboard/aggregate';

export function SpendingTrendChart({ data }: { data: DailySpend[] }) {
  const max = Math.max(...data.map((d) => d.total), 0);
  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm font-medium">Cheltuieli în ultimele 30 de zile</h2>
      {!hasData ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială în ultimele 30 de zile.</p>
      ) : (
        <svg
          viewBox="0 0 300 100"
          preserveAspectRatio="none"
          className="text-primary h-24 w-full"
          role="img"
          aria-label="Cheltuieli zilnice în ultimele 30 de zile"
        >
          {data.map((d, i) => {
            const barWidth = 300 / data.length;
            const height = max > 0 ? (d.total / max) * 92 : 0;
            return (
              <rect
                key={d.date}
                x={i * barWidth + barWidth * 0.15}
                y={100 - height}
                width={barWidth * 0.7}
                height={height}
                rx={1}
                className="fill-current opacity-80"
              >
                <title>
                  {d.date}: {d.total.toFixed(2)} lei
                </title>
              </rect>
            );
          })}
        </svg>
      )}
    </div>
  );
}
