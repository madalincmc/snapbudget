import Link from 'next/link';
import { ChartColumnIncreasing, ChevronRight, Repeat2, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatListDate } from '@/lib/dashboard/format';

export interface RecurringSummary {
  activeCount: number;
  next: { title: string; amount: number; nextDueDate: string } | null;
}

function QuickLink({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
    >
      <div className="bg-muted text-muted-foreground flex h-9 w-9 flex-none items-center justify-center rounded-lg">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground text-sm font-medium">{label}</span>
        <span className="text-muted-foreground truncate text-xs">{detail}</span>
      </div>
      <ChevronRight className="text-muted-foreground/60 h-4 w-4 flex-none" />
    </Link>
  );
}

/**
 * Recurring, analytics and budgets each had a full-width card of their own on
 * the dashboard, which put three navigation targets at the same visual weight
 * as the spending data above them. They are destinations, not readings, so
 * they share one card and stop competing with the numbers.
 */
export function QuickLinksCard({
  recurring,
  budgetCount,
}: {
  recurring: RecurringSummary;
  budgetCount: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col">
        <QuickLink
          href="/recurring"
          icon={Repeat2}
          label="Cheltuieli recurente"
          detail={
            recurring.next
              ? `${recurring.activeCount} active · urmează ${recurring.next.title}, ${formatListDate(
                  recurring.next.nextDueDate,
                )}`
              : 'Chirie, abonamente, utilități — adaugă-le o dată'
          }
        />
        <QuickLink
          href="/analytics"
          icon={ChartColumnIncreasing}
          label="Analiză pe 12 luni"
          detail="Tendințe pe categorii, medie lunară, totalul anului"
        />
        <QuickLink
          href="/budgets"
          icon={Target}
          label="Bugete"
          detail={
            budgetCount === 0
              ? 'Pune o limită lunară, pe total sau pe categorii'
              : `${budgetCount} ${budgetCount === 1 ? 'limită activă' : 'limite active'}`
          }
        />
      </CardContent>
    </Card>
  );
}
