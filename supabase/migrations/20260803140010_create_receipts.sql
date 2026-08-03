-- Receipts: one row per uploaded receipt image. OCR fields (merchant, amount,
-- purchase_date) and category are populated by later tickets (MAD-49, MAD-50);
-- this migration only needs storage_path and status.
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  merchant text,
  amount numeric(12, 2),
  purchase_date date,
  category text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receipts_user_id_created_at_idx
  on public.receipts (user_id, created_at desc);

alter table public.receipts enable row level security;

-- Data API is not auto-exposed for new tables by default; grant explicitly.
grant select, insert, update, delete on public.receipts to authenticated;

create policy "Users can view own receipts"
  on public.receipts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own receipts"
  on public.receipts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own receipts"
  on public.receipts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own receipts"
  on public.receipts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Storage: each user's files live under a `${user_id}/...` folder prefix.
create policy "Users can read own receipt files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own receipt files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can update own receipt files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'receipts'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'receipts'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own receipt files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
