import Link from 'next/link';
import { ChartColumnIncreasing, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Entry point to /analytics, matching how recurring and budgets are reached.
 * The dashboard answers "this month"; the link is for the question it cannot —
 * whether this month is normal.
 */
export function AnalyticsSummaryCard() {
  return (
    <Link href="/analytics" className="group/analytics block">
      <Card className="group-hover/analytics:bg-muted/40 transition-colors">
        <CardContent className="flex items-center gap-3">
          <div className="bg-muted text-muted-foreground flex h-10 w-10 flex-none items-center justify-center rounded-lg">
            <ChartColumnIncreasing className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-foreground text-sm font-medium">Analiză pe 12 luni</span>
            <span className="text-muted-foreground truncate text-xs">
              Tendințe pe categorii, medie lunară și totalul anului
            </span>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4 flex-none" />
        </CardContent>
      </Card>
    </Link>
  );
}
