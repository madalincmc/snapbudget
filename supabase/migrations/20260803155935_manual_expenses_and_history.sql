-- Manual expenses (MAD-59): no receipt image, so storage_path becomes optional,
-- and a `source` column distinguishes receipt-photo entries from manual ones.
alter table public.receipts alter column storage_path drop not null;

alter table public.receipts add column if not exists source text not null default 'receipt';
alter table public.receipts add column if not exists notes text;

alter table public.receipts
  add constraint receipts_source_check check (source in ('receipt', 'manual'));

-- History search/filter/sort (MAD-58): case-insensitive merchant search at
-- scale needs a trigram index; category/date power the filter and sort UI.
create extension if not exists pg_trgm;

create index if not exists receipts_merchant_trgm_idx
  on public.receipts using gin (merchant gin_trgm_ops);

create index if not exists receipts_category_idx on public.receipts (category);
create index if not exists receipts_purchase_date_idx on public.receipts (purchase_date);
