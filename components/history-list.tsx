'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { SourceBadge, StatusBadge, ReceiptThumbnail } from '@/components/receipt-badges';
import { MemberChip } from '@/components/member-chip';
import { formatListDate } from '@/lib/dashboard/format';
import { cn } from '@/lib/utils';
import type { HouseholdMemberInfo } from '@/lib/household/membership';
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
  user_id: string;
  merchant: string | null;
  amount: number | null;
  purchase_date: string | null;
  category: string | null;
  subcategory: string | null;
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
  ...Object.fromEntries(
    MONTH_NAMES.map((name, index) => [String(index + 1).padStart(2, '0'), name]),
  ),
};

const SORT_ITEMS: Record<string, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.value, o.label]),
);

export interface HistoryFilters {
  q?: string;
  category?: string;
  month?: string;
  year?: string;
  sort?: string;
  who?: string;
}

export function HistoryList({
  members = [],
  meUserId,
  initial = {},
}: {
  members?: HouseholdMemberInfo[];
  meUserId?: string;
  /** Seeded from the URL by the page, so filters survive editing a receipt
   *  and coming back — and so a filtered view can be shared or bookmarked. */
  initial?: HistoryFilters;
}) {
  const [search, setSearch] = useState(initial.q ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(initial.q ?? '');
  const [category, setCategory] = useState(initial.category ?? 'all');
  const [month, setMonth] = useState(initial.month ?? 'all');
  const [year, setYear] = useState(initial.year ?? String(CURRENT_YEAR));
  const [sort, setSort] = useState(initial.sort ?? 'date_desc');
  const [who, setWho] = useState(initial.who ?? 'all');

  const [receipts, setReceipts] = useState<HistoryReceipt[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const creators = Object.fromEntries(members.map((m) => [m.userId, m.displayName]));

  const hasActiveFilters =
    debouncedSearch !== '' || category !== 'all' || month !== 'all' || who !== 'all';

  function resetFilters() {
    setSearch('');
    setCategory('all');
    setMonth('all');
    setWho('all');
  }

  /** Non-default filters only, so a clean view keeps a clean URL. */
  const filterParams = new URLSearchParams();
  if (debouncedSearch) filterParams.set('q', debouncedSearch);
  if (category !== 'all') filterParams.set('category', category);
  if (month !== 'all') {
    filterParams.set('month', month);
    filterParams.set('year', year);
  }
  if (sort !== 'date_desc') filterParams.set('sort', sort);
  if (who !== 'all') filterParams.set('who', who);
  const filterQuery = filterParams.toString();

  useEffect(() => {
    // replaceState rather than router.replace: this only needs to keep the
    // address bar in step, and a Next navigation here would retrigger the
    // fetch effect below on every keystroke.
    const url = filterQuery
      ? `${window.location.pathname}?${filterQuery}`
      : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [filterQuery]);

  const returnTo = `/history${filterQuery ? `?${filterQuery}` : ''}`;

  const WHO_ITEMS: Record<string, string> = {
    all: 'Toți',
    me: 'Eu',
    ...Object.fromEntries(
      members
        .filter((m) => m.userId !== meUserId)
        .map((m) => [m.userId, m.displayName ?? 'Membru']),
    ),
  };

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
    if (who !== 'all') params.set('who', who);

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
  }, [debouncedSearch, category, month, year, sort, who]);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută după comerciant…"
          className="h-9 pl-8"
        />
      </div>

      {/* One scrollable row rather than a stack of full-width selects: four
          stacked dropdowns pushed every result below the fold on a phone.
          The mask fades the trailing edge so a half-visible control reads as
          "more to the right" rather than as a clipped layout. */}
      <div className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] px-1 pb-1 [&::-webkit-scrollbar]:hidden">
        <Select
          items={CATEGORY_ITEMS}
          value={category}
          onValueChange={(value) => setCategory(value ?? 'all')}
        >
          <SelectTrigger className="h-9 w-auto flex-none whitespace-nowrap">
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
          <SelectTrigger className="h-9 w-auto flex-none whitespace-nowrap">
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
            <SelectTrigger className="h-9 w-auto flex-none whitespace-nowrap">
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
          <SelectTrigger className="h-9 w-auto flex-none whitespace-nowrap">
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

        {members.length > 1 && (
          <Select items={WHO_ITEMS} value={who} onValueChange={(value) => setWho(value ?? 'all')}>
            <SelectTrigger className="h-9 w-auto flex-none whitespace-nowrap">
              <SelectValue placeholder="Cine" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WHO_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* First load only. A refetch holds the previous rows at reduced opacity
          instead (see the list below): swapping settled rows for skeletons on
          every keystroke would make the page flash and jump. */}
      {loading && receipts.length === 0 && !error ? (
        <ul className="divide-border flex flex-col divide-y" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <div className="sb-skeleton h-11 w-11 flex-none rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div
                  className="sb-skeleton h-3.5 rounded-full"
                  style={{ width: `${45 + ((i * 13) % 35)}%` }}
                />
                <div className="sb-skeleton h-2.5 w-24 rounded-full" />
              </div>
              <div className="sb-skeleton h-3.5 w-14 flex-none rounded-full" />
            </li>
          ))}
        </ul>
      ) : !loading && receipts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          {/* "Add your first receipt" is wrong when the user has plenty and the
              filters simply excluded them — offer to clear them instead. */}
          {hasActiveFilters ? (
            <>
              <p className="text-muted-foreground text-sm">
                Nicio cheltuială pentru filtrele alese.
              </p>
              <Button variant="outline" onClick={resetFilters}>
                Șterge filtrele
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">Nicio cheltuială încă.</p>
              <Button nativeButton={false} render={<Link href="/receipts/new" />}>
                Adaugă primul bon
              </Button>
            </>
          )}
        </div>
      ) : (
        <ul
          className={cn(
            'divide-border flex flex-col divide-y transition-opacity duration-200',
            loading && 'opacity-50',
          )}
        >
          {receipts.map((r) => (
            <li
              key={r.id}
              className="hover:bg-muted/40 flex items-center gap-3 rounded-lg py-3 transition-colors"
            >
              <ReceiptThumbnail
                source={r.source}
                category={r.category}
                thumbnailUrl={r.thumbnailUrl}
              />

              <Link
                href={`/receipts/${r.id}?from=${encodeURIComponent(returnTo)}`}
                className="flex min-w-0 flex-1 flex-col gap-0.5"
              >
                <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{r.merchant ?? 'Bon fără nume'}</span>
                  {meUserId && r.user_id !== meUserId && (
                    <MemberChip name={creators[r.user_id] ?? null} />
                  )}
                  <SourceBadge source={r.source} />
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatListDate(r.purchase_date ?? r.created_at)}
                  {r.amount !== null && ` · ${r.subcategory ?? r.category ?? 'Altele'}`}
                </span>
              </Link>

              <div className="flex flex-none items-center gap-2">
                {r.amount !== null ? (
                  <span className="text-foreground text-sm font-semibold tabular-nums">
                    {r.amount.toFixed(2)}
                    <span className="text-muted-foreground/70 text-xs font-normal"> lei</span>
                  </span>
                ) : (
                  <StatusBadge status={r.status} />
                )}

                <AlertDialog>
                  {/* Muted until reached for. In destructive red on every row
                      it was the loudest thing on the screen, which put the
                      strongest visual pull on the one irreversible action. */}
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 focus-visible:text-destructive"
                      >
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
