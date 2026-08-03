'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { ManualBadge, StatusBadge, ReceiptThumbnail } from '@/components/receipt-badges';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

const MONTH_NAMES = [
  'Ianuarie',
  'Februarie',
  'Martie',
  'Aprilie',
  'Mai',
  'Iunie',
  'Iulie',
  'August',
  'Septembrie',
  'Octombrie',
  'Noiembrie',
  'Decembrie',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i));

const CATEGORY_ITEMS: Record<string, string> = {
  all: 'Toate categoriile',
  ...Object.fromEntries(CATEGORIES.map((c) => [c, c])),
};

const MONTH_ITEMS: Record<string, string> = {
  all: 'Toate lunile',
  ...Object.fromEntries(MONTH_NAMES.map((name, index) => [String(index + 1).padStart(2, '0'), name])),
};

const SORT_ITEMS: Record<string, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.value, o.label]),
);

export function HistoryList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState(String(CURRENT_YEAR));
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
    if (category !== 'all') params.set('category', category);
    if (month !== 'all') params.set('month', `${year}-${month}`);

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
  }, [debouncedSearch, category, month, year, sort]);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-48">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după comerciant…"
            className="h-9 pl-8"
          />
        </div>

        <Select
          items={CATEGORY_ITEMS}
          value={category}
          onValueChange={(value) => setCategory(value ?? 'all')}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate categoriile</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={MONTH_ITEMS}
          value={month}
          onValueChange={(value) => setMonth(value ?? 'all')}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Lună" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate lunile</SelectItem>
            {MONTH_NAMES.map((name, index) => (
              <SelectItem key={name} value={String(index + 1).padStart(2, '0')}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {month !== 'all' && (
          <Select value={year} onValueChange={(value) => setYear(value ?? String(CURRENT_YEAR))}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="An" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          items={SORT_ITEMS}
          value={sort}
          onValueChange={(value) => setSort(value ?? 'date_desc')}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Sortare" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {!loading && receipts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground text-sm">Niciun bon găsit.</p>
          <Button nativeButton={false} render={<Link href="/receipts/new" />}>
            Adaugă primul bon
          </Button>
        </div>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <ReceiptThumbnail source={r.source} thumbnailUrl={r.thumbnailUrl} />

              <Link href={`/receipts/${r.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{r.merchant ?? 'Bon fără nume'}</span>
                  {r.source === 'manual' && <ManualBadge />}
                </span>
                <span className="text-muted-foreground text-xs">
                  {(r.purchase_date ?? r.created_at).slice(0, 10)}
                  {r.amount !== null && ` · ${r.category ?? 'Altele'}`}
                </span>
              </Link>

              <div className="flex flex-none items-center gap-3">
                {r.amount !== null ? (
                  <span className="text-foreground text-sm font-medium tabular-nums">
                    {r.amount.toFixed(2)} lei
                  </span>
                ) : (
                  <StatusBadge status={r.status} />
                )}

                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" className="text-destructive">
                        <Trash2 />
                        <span className="sr-only">Șterge bonul</span>
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ștergi acest bon?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {r.merchant ?? 'Acest bon'} va fi șters definitiv. Nu poate fi anulat.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anulează</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => handleDelete(r.id)}>
                        Șterge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => fetchPage(receipts.length, false)}
        >
          {loading ? 'Se încarcă…' : 'Încarcă mai multe'}
        </Button>
      )}
    </div>
  );
}
