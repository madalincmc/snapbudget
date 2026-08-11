import { Receipt, Repeat2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_BADGE_CLASS, isCategory } from '@/lib/categories';
import { cn } from '@/lib/utils';

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

const SOURCE_ICON = {
  manual: Wallet,
  recurring: Repeat2,
  receipt: Receipt,
} as const;

const SOURCE_TITLE = {
  manual: 'Cheltuială manuală, fără poză',
  recurring: 'Generată dintr-o cheltuială recurentă',
  receipt: 'Bon fără imagine',
} as const;

/**
 * Carries two facts in the space that used to carry half of one: the tile is
 * tinted by category and the glyph names the source. Previously every row in
 * every list showed the same grey receipt icon, which added weight to the
 * layout without telling the reader anything they could not already see.
 */
export function ReceiptThumbnail({
  source,
  category,
  thumbnailUrl,
}: {
  source: string;
  category?: string | null;
  thumbnailUrl?: string | null;
}) {
  if (thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbnailUrl} alt="" className="h-11 w-11 flex-none rounded-xl object-cover" />
    );
  }

  const key = source === 'manual' || source === 'recurring' ? source : 'receipt';
  const Icon = SOURCE_ICON[key];
  // Narrowed via the guard on a local, so TS carries the type into the lookup.
  const raw = category ?? null;
  const tint = CATEGORY_BADGE_CLASS[isCategory(raw) ? raw : 'Altele'];

  return (
    <div
      title={SOURCE_TITLE[key]}
      className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-xl', tint)}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}
