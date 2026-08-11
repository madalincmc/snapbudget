import Link from 'next/link';
import { Camera, Plus, Repeat2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Shown until the very first expense exists. The metric cards are all zeros
 * and dashes at that point, which reads as a broken dashboard rather than a
 * new account — this replaces them with the one thing there is to do.
 */
export function DashboardEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-2xl">
          <ScanLine className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-foreground text-base font-medium">Adaugă prima cheltuială</h2>
          <p className="text-muted-foreground mx-auto max-w-xs text-sm">
            Fotografiază un bon și completăm noi magazinul, suma și data. Totalurile și graficele
            apar imediat ce ai prima cheltuială.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2 pt-1">
          <Button
            size="lg"
            className="h-11 rounded-full"
            nativeButton={false}
            render={<Link href="/receipts/new" />}
          >
            <Camera />
            Fotografiază un bon
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/expenses/new" />}
            className="text-muted-foreground"
          >
            <Plus />
            Sau adaugă manual
          </Button>
        </div>

        {/* Recurring lives here too: the summary card that normally links to it
            only renders once at least one expense exists, and setting up rent
            or a subscription is a perfectly reasonable first thing to do. */}
        <div className="mt-2 w-full max-w-xs border-t pt-4">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/recurring" />}
            className="text-muted-foreground"
          >
            <Repeat2 />
            Ai chirie sau abonamente? Adaugă-le o dată
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
