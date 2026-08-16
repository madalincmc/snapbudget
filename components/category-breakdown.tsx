'use client';

import type * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CATEGORY_BAR_CLASS, type Category } from '@/lib/categories';
import { BUDGET_TEXT_CLASS } from '@/components/budget-bar';
import { cn } from '@/lib/utils';
import { money } from '@/lib/dashboard/format';
import type { BudgetProgress } from '@/lib/budgets';
import type { CategoryTotal } from '@/lib/dashboard/aggregate';

/** Categories shown before the list collapses; the rest sit behind a disclosure. */
const VISIBLE_COUNT = 5;
/** Segments the composition bar carries before the tail is rolled up. */
const SEGMENT_COUNT = 6;

interface Slice {
  category: Category;
  total: number;
  share: number;
}

/**
 * Where the month went, as one bar.
 *
 * Part-to-whole, so it is a stacked bar rather than a ring: a donut asks the
 * reader to compare arcs, and the two segments that matter here are usually
 * close enough that arc length is guesswork. Segments are separated by a 2px
 * gap in the surface colour rather than by a stroke, and the ranked list below
 * is the legend — identity is never carried by colour alone.
 */
function CompositionBar({
  slices,
  rest,
  activeCategory,
  onActivate,
}: {
  slices: Slice[];
  /** Everything past the segment cap, merged. */
  rest: number;
  activeCategory: Category | null;
  onActivate: (category: Category | null) => void;
}) {
  return (
    <div
      className="sb-widen flex h-2.5 w-full gap-[2px]"
      onPointerLeave={() => onActivate(null)}
      aria-hidden
    >
      {slices.map(({ category, total, share }, index) => (
        <button
          key={category}
          type="button"
          tabIndex={-1}
          onPointerEnter={() => onActivate(category)}
          onPointerDown={() => onActivate(category)}
          style={{ flexGrow: total, '--sb-delay': `${index * 45}ms` } as React.CSSProperties}
          className={cn(
            'h-full basis-0 rounded-[3px] transition-[opacity,transform] duration-200 first:rounded-l-full last:rounded-r-full',
            CATEGORY_BAR_CLASS[category],
            activeCategory !== null && activeCategory !== category ? 'opacity-35' : 'opacity-100',
            activeCategory === category && 'scale-y-125',
          )}
          title={`${category} · ${share}%`}
        />
      ))}
      {rest > 0 && (
        <span
          style={{ flexGrow: rest }}
          className="bg-muted-foreground/35 h-full basis-0 rounded-[3px] last:rounded-r-full"
        />
      )}
    </div>
  );
}

function CategoryRow({
  category,
  total,
  share,
  max,
  budget,
  active,
  dimmed,
  onActivate,
  delay,
  href,
}: {
  category: Category;
  total: number;
  share: number;
  max: number;
  budget?: BudgetProgress;
  active: boolean;
  dimmed: boolean;
  onActivate: (category: Category | null) => void;
  delay: number;
  /** Set makes the row open that category's screen; absent leaves it inert. */
  href?: string;
}) {
  // The bar is scaled to the biggest category, not to the limit, so the tick
  // lands where the limit actually falls against its peers. A limit above the
  // tallest bar would sit off the end — clamped so it stays visible and still
  // reads as "not reached yet".
  const tickPercent = budget && max > 0 ? Math.min((budget.budget.amount / max) * 100, 99) : null;

  // Same element either way, so the row keeps its hover state, its stagger and
  // its spacing whether or not there is somewhere to go.
  const rowProps = {
    onPointerEnter: () => onActivate(category),
    onPointerLeave: () => onActivate(null),
    style: { '--sb-delay': `${delay}ms` } as React.CSSProperties,
    className: cn(
      'group/cat sb-rise -mx-1.5 flex flex-col gap-1.5 rounded-lg px-1.5 py-1 transition-[opacity,background-color] duration-200',
      active && 'bg-muted/60',
      dimmed && 'opacity-45',
      href && 'sb-press hover:bg-muted/60',
    ),
  };

  const content = (
    <>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-baseline gap-2">
          {/* The swatch is what ties this row to its segment in the bar above. */}
          <span
            className={cn(
              'h-2 w-2 flex-none translate-y-px rounded-full transition-transform duration-200',
              CATEGORY_BAR_CLASS[category],
              active && 'scale-135',
            )}
            aria-hidden
          />
          <span className="text-foreground min-w-0 truncate font-medium">{category}</span>
        </span>
        <span className="flex flex-none items-baseline gap-2">
          {/* Share carries the comparison the bar only implies, and keeps its
              meaning when a screenshot loses the bar. */}
          <span className="text-muted-foreground/70 text-xs tabular-nums">{share}%</span>
          <span
            className={cn(
              'tabular-nums',
              budget && budget.status !== 'under'
                ? BUDGET_TEXT_CLASS[budget.status]
                : 'text-foreground',
            )}
          >
            {money(total)}
            <span className="text-muted-foreground/70 text-xs"> lei</span>
          </span>
          {/* The one affordance that survives a touchscreen, where there is no
              hover to reveal that the row leads anywhere. */}
          {href && (
            <ChevronRight
              className="text-muted-foreground/40 h-3.5 w-3.5 self-center transition-transform duration-200 group-hover/cat:translate-x-0.5"
              aria-hidden
            />
          )}
        </span>
      </div>

      {/* Thin: eight full-width bars at a heavier height read as a barcode and
          swamp everything below them on the page. */}
      <div className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            'sb-widen h-full rounded-full transition-[filter] duration-200',
            CATEGORY_BAR_CLASS[category],
            active && 'brightness-110 saturate-125',
          )}
          style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
        />
        {tickPercent !== null && (
          <div
            className="bg-foreground/50 absolute inset-y-0 w-0.5"
            style={{ left: `${tickPercent}%` }}
            aria-hidden
          />
        )}
      </div>

      {budget && (
        <p className="text-muted-foreground text-xs tabular-nums">
          Buget {budget.budget.amount.toFixed(0)} lei ·{' '}
          <span className={budget.status === 'under' ? '' : BUDGET_TEXT_CLASS[budget.status]}>
            {budget.remaining >= 0
              ? `au mai rămas ${budget.remaining.toFixed(0)}`
              : `depășit cu ${Math.abs(budget.remaining).toFixed(0)}`}
          </span>
        </p>
      )}
    </>
  );

  return href ? (
    <Link href={href} aria-label={`${category} — vezi cheltuielile`} {...rowProps}>
      {content}
    </Link>
  ) : (
    <div {...rowProps}>{content}</div>
  );
}

export function CategoryBreakdown({
  categoryTotals,
  budgets = {},
  categoryHrefs = {},
}: {
  categoryTotals: CategoryTotal[];
  budgets?: Partial<Record<Category, BudgetProgress>>;
  /**
   * Per-category destinations, prebuilt on the server. A function that maps a
   * category to a path would be the obvious shape and cannot be used: this is a
   * client component, and a function prop does not survive the boundary.
   *
   * Left empty in the demo, where the rows have nowhere to lead — the category
   * screen needs an account, same as the receipt detail screen.
   */
  categoryHrefs?: Partial<Record<Category, string>>;
}) {
  const [active, setActive] = useState<Category | null>(null);

  const withSpending = categoryTotals.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const max = Math.max(...withSpending.map((c) => c.total), 0);
  const total = withSpending.reduce((sum, c) => sum + c.total, 0);

  const shareOf = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const visible = withSpending.slice(0, VISIBLE_COUNT);
  const hidden = withSpending.slice(VISIBLE_COUNT);

  const slices: Slice[] = withSpending.slice(0, SEGMENT_COUNT).map((c) => ({
    category: c.category,
    total: c.total,
    share: shareOf(c.total),
  }));
  const rest = withSpending.slice(SEGMENT_COUNT).reduce((sum, c) => sum + c.total, 0);

  const activeSlice = active ? withSpending.find((c) => c.category === active) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Pe categorii
        </h2>
        {/* Reads out whatever is under the pointer, and falls back to the total
            — so the line never empties and the layout never jumps. */}
        <span className="text-xs tabular-nums">
          {activeSlice ? (
            <>
              <span className="text-muted-foreground">{activeSlice.category} · </span>
              <span className="text-foreground font-medium">
                {shareOf(activeSlice.total)}% · {money(activeSlice.total, 0)} lei
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">total {money(total, 0)} lei</span>
          )}
        </span>
      </div>

      {withSpending.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială luna aceasta.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <CompositionBar
            slices={slices}
            rest={rest}
            activeCategory={active}
            onActivate={setActive}
          />

          <div className="flex flex-col gap-3">
            {visible.map(({ category, total: categoryTotal }, index) => (
              <CategoryRow
                key={category}
                category={category}
                total={categoryTotal}
                share={shareOf(categoryTotal)}
                max={max}
                budget={budgets[category]}
                active={active === category}
                dimmed={active !== null && active !== category}
                onActivate={setActive}
                delay={index * 50}
                href={categoryHrefs[category]}
              />
            ))}

            {hidden.length > 0 && (
              // <details> rather than state: the disclosure works with no
              // JavaScript, and it keeps the open/closed decision out of the
              // hover state this component already tracks.
              <details className="group/more flex flex-col gap-3">
                <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs font-medium transition-colors marker:content-none">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open/more:rotate-180" />
                  <span className="group-open/more:hidden">
                    Încă {hidden.length} {hidden.length === 1 ? 'categorie' : 'categorii'}
                  </span>
                  <span className="hidden group-open/more:inline">Arată mai puțin</span>
                </summary>

                <div className="mt-3 flex flex-col gap-3">
                  {hidden.map(({ category, total: categoryTotal }, index) => (
                    <CategoryRow
                      key={category}
                      category={category}
                      total={categoryTotal}
                      share={shareOf(categoryTotal)}
                      max={max}
                      budget={budgets[category]}
                      active={active === category}
                      dimmed={active !== null && active !== category}
                      onActivate={setActive}
                      delay={index * 50}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
