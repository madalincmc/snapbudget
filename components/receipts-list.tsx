import Link from 'next/link';
import type { ReceiptRow } from '@/lib/dashboard/aggregate';
import { ManualBadge, StatusBadge, ReceiptThumbnail } from '@/components/receipt-badges';

export function ReceiptsList({ receipts }: { receipts: ReceiptRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm font-medium">Ultimele bonuri</h2>
      {receipts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Niciun bon încă.</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {receipts.map((r) => (
            <li key={r.id}>
              <Link
                href={`/receipts/${r.id}`}
                className="hover:bg-muted/50 flex items-center gap-3 py-3 transition-colors"
              >
                <ReceiptThumbnail source={r.source} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{r.merchant ?? 'Bon fără nume'}</span>
                    {r.source === 'manual' && <ManualBadge />}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {(r.purchase_date ?? r.created_at).slice(0, 10)}
                    {r.amount !== null && ` · ${r.category ?? 'Altele'}`}
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
          ))}
        </ul>
      )}
    </div>
  );
}
