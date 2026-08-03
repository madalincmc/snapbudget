import { CATEGORY_BAR_CLASS } from '@/lib/categories';
import type { CategoryTotal } from '@/lib/dashboard/aggregate';

export function CategoryBreakdown({ categoryTotals }: { categoryTotals: CategoryTotal[] }) {
  const max = Math.max(...categoryTotals.map((c) => c.total), 0);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Cheltuieli pe categorii
      </h2>
      <div className="flex flex-col gap-3">
        {categoryTotals.map(({ category, total }) => (
          <div key={category} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-black dark:text-zinc-50">{category}</span>
              <span className="text-zinc-600 tabular-nums dark:text-zinc-400">
                {total.toFixed(2)} lei
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full ${CATEGORY_BAR_CLASS[category]}`}
                style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
