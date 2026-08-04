import { CATEGORY_BAR_CLASS } from '@/lib/categories';
import type { CategoryTotal } from '@/lib/dashboard/aggregate';

export function CategoryBreakdown({ categoryTotals }: { categoryTotals: CategoryTotal[] }) {
  const withSpending = categoryTotals.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const max = Math.max(...withSpending.map((c) => c.total), 0);
  const total = withSpending.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm font-medium">Pe categorii</h2>
      {withSpending.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială luna aceasta.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {withSpending.map(({ category, total: categoryTotal }) => (
            <div key={category} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-foreground truncate">{category}</span>
                <span className="flex flex-none items-baseline gap-2">
                  {/* Share carries the comparison the bar only implies, and
                      keeps its meaning when a screenshot loses the bar. */}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {total > 0 ? Math.round((categoryTotal / total) * 100) : 0}%
                  </span>
                  <span className="text-foreground tabular-nums">{categoryTotal.toFixed(2)} lei</span>
                </span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full ${CATEGORY_BAR_CLASS[category]}`}
                  style={{ width: `${max > 0 ? (categoryTotal / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
