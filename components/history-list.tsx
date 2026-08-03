'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';

interface HistoryReceipt {
  id: string;
  merchant: string | null;
  amount: number | null;
  purchase_date: string | null;
  category: string | null;
  status: string;
  source: string;
  created_at: string;
  thumbnailUrl: string | null;
}

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Dată — cele mai noi' },
  { value: 'date_asc', label: 'Dată — cele mai vechi' },
  { value: 'amount_desc', label: 'Sumă — descrescător' },
  { value: 'amount_asc', label: 'Sumă — crescător' },
  { value: 'merchant_asc', label: 'Comerciant A–Z' },
  { value: 'merchant_desc', label: 'Comerciant Z–A' },
];

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

function ManualBadge() {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      Manual
    </span>
  );
}

export function HistoryList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState('');
  const [sort, setSort] = useState('date_desc');

  const [receipts, setReceipts] = useState<HistoryReceipt[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function fetchPage(offset: number, replace: boolean) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ sort, offset: String(offset) });
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (category) params.set('category', category);
    if (month) params.set('month', month);

    try {
      const response = await fetch(`/api/receipts/history?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Eroare la încărcare.');

      setReceipts((prev) => (replace ? data.receipts : [...prev, ...data.receipts]));
      setHasMore(data.hasMore);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // fetchPage sets loading/error state; standard fetch-on-filter-change effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(0, true);
    // fetchPage is stable across renders (reads current state via closure by design).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, month, sort]);

  async function handleDelete(id: string) {
    if (!confirm('Sigur ștergi acest bon? Nu poate fi anulat.')) return;

    const response = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută după comerciant…"
          className="h-11 flex-1 rounded-lg border border-black/[.08] bg-white px-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white"
        >
          <option value="">Toate categoriile</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && receipts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Niciun bon găsit.</p>
          <Link
            href="/receipts/new"
            className="bg-foreground text-background flex h-11 items-center justify-center rounded-full px-5 font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Adaugă primul bon
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              {r.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.thumbnailUrl}
                  alt=""
                  className="h-12 w-12 flex-none rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 flex-none rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              )}

              <Link href={`/receipts/${r.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium text-black dark:text-zinc-50">
                  <span className="truncate">{r.merchant ?? 'Bon fără nume'}</span>
                  {r.source === 'manual' && <ManualBadge />}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(r.purchase_date ?? r.created_at).slice(0, 10)}
                  {r.amount !== null && ` · ${r.category ?? 'Altele'}`}
                </span>
              </Link>

              <div className="flex flex-none items-center gap-3">
                {r.amount !== null ? (
                  <span className="text-sm font-medium text-black tabular-nums dark:text-zinc-50">
                    {r.amount.toFixed(2)} lei
                  </span>
                ) : (
                  <StatusBadge status={r.status} />
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Șterge
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          disabled={loading}
          onClick={() => fetchPage(receipts.length, false)}
          className="h-11 rounded-full border border-black/[.08] text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:text-white dark:hover:bg-[#1a1a1a]"
        >
          {loading ? 'Se încarcă…' : 'Încarcă mai multe'}
        </button>
      )}
    </div>
  );
}
