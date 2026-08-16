import type * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReceiptRow } from '@/lib/dashboard/aggregate';
import { formatListDate } from '@/lib/dashboard/format';
import { SourceBadge, StatusBadge, ReceiptThumbnail } from '@/components/receipt-badges';
import { MemberChip } from '@/components/member-chip';

interface CreatorInfo {
  displayName: string | null;
}

export function ReceiptsList({
  receipts,
  meUserId,
  creators,
  title = 'Ultimele cheltuieli',
  emptyLabel = 'Nicio cheltuială încă.',
  historyHref = '/history',
  linkReceipts = true,
  from,
}: {
  receipts: ReceiptRow[];
  meUserId?: string;
  creators?: Record<string, CreatorInfo>;
  /** The category screen shows a whole month, not the last few. */
  title?: string;
  emptyLabel?: string;
  /** Where "Vezi tot" goes — the demo has a history of its own. Null drops the
   *  link, for a list that is already everything there is. */
  historyHref?: string | null;
  /** Off in the demo: there is no receipt detail screen without an account. */
  linkReceipts?: boolean;
  /** Carried into the receipt links so saving or deleting returns here. */
  from?: string;
}) {
  const receiptHref = (id: string) =>
    from ? `/receipts/${id}?from=${encodeURIComponent(from)}` : `/receipts/${id}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </h2>
        {historyHref && receipts.length > 0 && (
          <Link
            href={historyHref}
            className="text-muted-foreground hover:text-foreground group/all inline-flex items-center gap-1 text-xs transition-colors"
          >
            Vezi tot
            <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover/all:translate-x-0.5" />
          </Link>
        )}
      </div>

      {receipts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {receipts.map((r, index) => {
            const creatorName =
              meUserId && r.user_id !== meUserId
                ? (creators?.[r.user_id]?.displayName ?? null)
                : null;
            const isOther = Boolean(meUserId && r.user_id !== meUserId);

            const row = (
              <>
                <ReceiptThumbnail source={r.source} category={r.category} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{r.merchant ?? 'Bon fără nume'}</span>
                    {isOther && <MemberChip name={creatorName} />}
                    <SourceBadge source={r.source} />
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatListDate(r.purchase_date ?? r.created_at)}
                    {r.amount !== null && ` · ${r.subcategory ?? r.category ?? 'Altele'}`}
                  </span>
                </div>
                {r.amount !== null ? (
                  <span className="text-foreground flex-none text-sm font-semibold tabular-nums">
                    {r.amount.toFixed(2)}
                    <span className="text-muted-foreground/70 text-xs font-normal"> lei</span>
                  </span>
                ) : (
                  <StatusBadge status={r.status} />
                )}
              </>
            );

            return (
              <li
                key={r.id}
                style={{ '--sb-delay': `${index * 50}ms` } as React.CSSProperties}
                className="sb-rise"
              >
                {linkReceipts ? (
                  <Link
                    href={receiptHref(r.id)}
                    className="sb-press hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
