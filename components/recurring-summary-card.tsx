import Link from 'next/link';
import { ChevronRight, Repeat2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatListDate } from '@/lib/dashboard/format';

export interface RecurringSummary {
  activeCount: number;
  next: { title: string; amount: number; nextDueDate: string } | null;
}

/**
 * Doubles as the entry point to /recurring. A permanent nav tab would be too
 * prominent for something you configure once and forget, but "what is coming
 * and when" is worth a glance every time the dashboard opens.
 */
export function RecurringSummaryCard({ summary }: { summary: RecurringSummary }) {
  const { activeCount, next } = summary;

  return (
    <Link href="/recurring" className="group/recurring block">
      <Card className="group-hover/recurring:bg-muted/40 transition-colors">
        <CardContent className="flex items-center gap-3">
          <div className="bg-muted text-muted-foreground flex h-10 w-10 flex-none items-center justify-center rounded-lg">
            <Repeat2 className="h-5 w-5" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-foreground text-sm font-medium">
              {activeCount === 0
                ? 'Cheltuieli recurente'
                : `${activeCount} ${activeCount === 1 ? 'recurentă activă' : 'recurente active'}`}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {next
                ? `Urmează ${next.title} · ${formatListDate(next.nextDueDate)} · ${next.amount.toFixed(2)} lei`
                : 'Chirie, abonamente, utilități — adaugă-le o dată'}
            </span>
          </div>

          <ChevronRight className="text-muted-foreground h-4 w-4 flex-none" />
        </CardContent>
      </Card>
    </Link>
  );
}
