import type { ReceiptRow } from '@/lib/dashboard/aggregate';

function StatusBadge({ status }: { status: string }) {
  const isPending = status === 'pending';
  const label = isPending ? 'Se procesează' : 'Editare necesară';
  const dotClass = isPending ? 'bg-[#fab219]' : 'bg-[#ec835a]';

  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function ReceiptsList({ receipts }: { receipts: ReceiptRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Ultimele bonuri</h2>
      {receipts.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Niciun bon încă.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  {r.merchant ?? 'Bon fără nume'}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(r.purchase_date ?? r.created_at).slice(0, 10)}
                  {r.amount !== null && ` · ${r.category ?? 'Altele'}`}
                </span>
              </div>
              {r.amount !== null ? (
                <span className="text-sm font-medium text-black tabular-nums dark:text-zinc-50">
                  {r.amount.toFixed(2)} lei
                </span>
              ) : (
                <StatusBadge status={r.status} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
