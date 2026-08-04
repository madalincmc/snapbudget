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
}: {
  receipts: ReceiptRow[];
  meUserId?: string;
  creators?: Record<string, CreatorInfo>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Ultimele cheltuieli</h2>
        {receipts.length > 0 && (
          <Link
            href="/history"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            Vezi tot
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {receipts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nicio cheltuială încă.</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {receipts.map((r) => {
            const creatorName =
              meUserId && r.user_id !== meUserId ? (creators?.[r.user_id]?.displayName ?? null) : null;
            const isOther = Boolean(meUserId && r.user_id !== meUserId);

            return (
              <li key={r.id}>
                <Link
                  href={`/receipts/${r.id}`}
                  className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors"
                >
                  <ReceiptThumbnail source={r.source} />
                  <div className="flex min-w-0 flex-1 flex-col">
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
                    <span className="text-foreground flex-none text-sm font-medium tabular-nums">
                      {r.amount.toFixed(2)} lei
                    </span>
                  ) : (
                    <StatusBadge status={r.status} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
