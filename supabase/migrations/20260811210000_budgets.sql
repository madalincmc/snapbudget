-- Budgets (MAD-67): a monthly limit, either overall (category is null) or for
-- one category. Progress is always derived at read time from the expenses that
-- already exist — nothing here stores a running total, so an edited or deleted
-- expense needs no counter to be kept in step.
--
-- Scope mirrors how the dashboard already reads spending: a personal budget
-- (household_id null) is measured against the owner's own expenses, a
-- household budget against everything the household can see. Which one the
-- dashboard shows follows the existing "who" filter, so the limit on screen
-- always matches the total above it.

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Set = a shared household budget; null = personal to user_id.
  household_id uuid references public.households (id) on delete cascade,
  -- Null = the overall budget. Left unconstrained, like receipts.category:
  -- the category list lives in TypeScript and is validated in the server
  -- action, so renaming one there does not need a migration here.
  category text,
  amount numeric(12, 2) not null check (amount > 0),
  -- Only 'monthly' for now. The column exists so weekly/yearly become a check
  -- constraint change rather than a table migration.
  period text not null default 'monthly' check (period in ('monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One budget per (scope, category). This needs four partial indexes rather
-- than a single unique constraint for two reasons:
--   1. Postgres treats NULLs as distinct in a unique index, so a plain
--      unique (user_id, household_id, category) would happily allow two
--      overall budgets — the null categories never collide.
--   2. A household budget is keyed on household_id *without* user_id, so two
--      members cannot each create a second budget for the same category.
create unique index if not exists budgets_personal_overall_unique
  on public.budgets (user_id)
  where household_id is null and category is null;

create unique index if not exists budgets_personal_category_unique
  on public.budgets (user_id, category)
  where household_id is null and category is not null;

create unique index if not exists budgets_household_overall_unique
  on public.budgets (household_id)
  where household_id is not null and category is null;

create unique index if not exists budgets_household_category_unique
  on public.budgets (household_id, category)
  where household_id is not null and category is not null;

create index if not exists budgets_user_id_idx on public.budgets (user_id);
create index if not exists budgets_household_id_idx on public.budgets (household_id);

create or replace function public.set_budget_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_budget_updated_at();

alter table public.budgets enable row level security;

-- Data API is not auto-exposed for new tables by default; grant explicitly.
grant select, insert, update, delete on public.budgets to authenticated;

create policy "Users can view own or household budgets"
  on public.budgets for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "Users can create own or household budgets"
  on public.budgets for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (household_id is null or public.is_household_member(household_id))
  );

-- Unlike receipts, update/delete are not creator-only for household budgets.
-- An expense is a record of something one person did; a household budget is
-- shared configuration that every member is already spending against, so
-- whoever set it must not be the only one able to correct it. Personal
-- budgets stay creator-only.
create policy "Users can edit own budgets, members edit household budgets"
  on public.budgets for update
  to authenticated
  using (
    (household_id is null and (select auth.uid()) = user_id)
    or (household_id is not null and public.is_household_member(household_id))
  )
  with check (
    (household_id is null and (select auth.uid()) = user_id)
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "Users can delete own budgets, members delete household budgets"
  on public.budgets for delete
  to authenticated
  using (
    (household_id is null and (select auth.uid()) = user_id)
    or (household_id is not null and public.is_household_member(household_id))
  );
