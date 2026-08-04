import { Receipt, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ManualBadge() {
  return (
    <Badge className="border-transparent bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
      Manual
    </Badge>
  );
}

export function RecurringBadge() {
  return (
    <Badge className="border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
      Recurent
    </Badge>
  );
}

/** Badge for an expense's origin — nothing for a scanned receipt, which is
 *  the default and needs no label. */
export function SourceBadge({ source }: { source: string }) {
  if (source === 'manual') return <ManualBadge />;
  if (source === 'recurring') return <RecurringBadge />;
  return null;
}

export function StatusBadge({ status }: { status: string }) {
  const isPending = status === 'pending';
  return (
    <Badge
      className={
        isPending
          ? 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
          : 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300'
      }
    >
      {isPending ? 'Se procesează' : 'Editare necesară'}
    </Badge>
  );
}

export function ReceiptThumbnail({
  source,
  thumbnailUrl,
}: {
  source: string;
  thumbnailUrl?: string | null;
}) {
  if (thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbnailUrl} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
    );
  }

  const isManual = source === 'manual';

  return (
    <div
      title={isManual ? 'Cheltuială manuală, fără poză' : 'Bon fără imagine'}
      className={
        'flex h-12 w-12 flex-none items-center justify-center rounded-lg ' +
        (isManual
          ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300'
          : 'bg-muted text-muted-foreground')
      }
    >
      {isManual ? <Wallet className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
    </div>
  );
}
