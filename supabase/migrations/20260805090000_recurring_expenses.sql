-- Recurring expenses (MAD-62): rules that mint ordinary expense rows on a
-- schedule. Generated rows are plain receipts with source = 'recurring', so
-- every existing dashboard, chart and history query picks them up unchanged.
--
-- Generation runs inside Postgres on a pg_cron schedule rather than from a
-- Vercel cron job: sweeping every user's rules over HTTP would need the
-- service-role key, which would be the first RLS bypass in the codebase.

create extension if not exists pg_cron;

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  subcategory text,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date date not null,
  -- Occurrences already accounted for. Maintained by trigger and by the
  -- generator; never set by hand from the app.
  occurrences_generated integer not null default 0,
  next_due_date date not null default current_date,
  paused boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_expenses_user_id_idx on public.recurring_expenses (user_id);
-- The generator's sweep predicate.
create index if not exists recurring_expenses_due_idx
  on public.recurring_expenses (next_due_date)
  where paused = false;

alter table public.receipts
  add column if not exists recurring_expense_id uuid references public.recurring_expenses (id) on delete set null;

-- Idempotency guard. Generation is safe to run repeatedly (cron, plus an
-- immediate call after create/resume) only because a second attempt at the
-- same occurrence collides here instead of duplicating a financial record.
create unique index if not exists receipts_recurring_occurrence_unique
  on public.receipts (recurring_expense_id, purchase_date)
  where recurring_expense_id is not null;

alter table public.receipts drop constraint if exists receipts_source_check;
alter table public.receipts
  add constraint receipts_source_check check (source in ('receipt', 'manual', 'recurring'));

-- The nth occurrence, always computed from start_date rather than by
-- repeatedly advancing a cursor. Incrementing would drift: rent on the 31st
-- would clamp to the 28th in February and then stay on the 28th forever.
-- Postgres clamps each calculation independently, so Jan 31 + 2 months is
-- Mar 31, not Feb 28 + 1 month.
create or replace function public.recurring_occurrence_date(
  _start_date date,
  _frequency text,
  _n integer
)
returns date
language sql
immutable
as $$
  select case _frequency
    when 'weekly' then _start_date + (_n * 7)
    when 'monthly' then (_start_date + (_n * interval '1 month'))::date
    when 'yearly' then (_start_date + (_n * interval '1 year'))::date
  end;
$$;

-- Index of the first occurrence falling on or after _from. Estimates, then
-- corrects in both directions, because month lengths make the estimate
-- off-by-one either way; the correction loop runs once or twice, never a
-- full scan from start_date.
create or replace function public.recurring_skip_to(
  _start_date date,
  _frequency text,
  _from date
)
returns integer
language plpgsql
immutable
as $$
declare
  n integer;
begin
  if _from <= _start_date then
    return 0;
  end if;

  n := greatest(
    case _frequency
      when 'weekly' then ceil((_from - _start_date)::numeric / 7)::int
      when 'monthly' then (
        (extract(year from _from) - extract(year from _start_date)) * 12
        + (extract(month from _from) - extract(month from _start_date))
      )::int
      when 'yearly' then (extract(year from _from) - extract(year from _start_date))::int
    end,
    0
  );

  while n > 0 and public.recurring_occurrence_date(_start_date, _frequency, n - 1) >= _from loop
    n := n - 1;
  end loop;
  while public.recurring_occurrence_date(_start_date, _frequency, n) < _from loop
    n := n + 1;
  end loop;

  return n;
end;
$$;

create or replace function public.set_recurring_schedule()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- No retroactive backfill: a start_date in the past records when the
  -- commitment began, it does not rewrite history. Occurrences that already
  -- passed are marked as accounted for, so generation starts from today.
  if tg_op = 'INSERT'
     or new.start_date is distinct from old.start_date
     or new.frequency is distinct from old.frequency then
    new.occurrences_generated := public.recurring_skip_to(
      new.start_date, new.frequency, current_date
    );
  end if;

  new.next_due_date := public.recurring_occurrence_date(
    new.start_date, new.frequency, new.occurrences_generated
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists recurring_expenses_schedule on public.recurring_expenses;
create trigger recurring_expenses_schedule
  before insert or update on public.recurring_expenses
  for each row execute function public.set_recurring_schedule();

-- Resuming skips whatever fell due while paused, rather than dumping a pile
-- of backdated expenses the moment the rule is switched back on.
-- security invoker, so RLS still restricts this to the caller's own rules.
create or replace function public.resume_recurring_expense(_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.recurring_expenses
     set paused = false,
         occurrences_generated = public.recurring_skip_to(start_date, frequency, current_date)
   where id = _id;
$$;

-- Core generator. security definer so the cron sweep can write rows on behalf
-- of every user; household is resolved at generation time rather than
-- snapshotted on the rule, so joining or leaving a household is reflected
-- immediately.
create or replace function public._generate_recurring(_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rule record;
  due date;
  household uuid;
  n integer;
  created integer := 0;
begin
  for rule in
    select * from public.recurring_expenses
    where paused = false
      and (_user_id is null or user_id = _user_id)
      and next_due_date <= current_date
  loop
    select hm.household_id into household
    from public.household_members hm
    where hm.user_id = rule.user_id;

    n := rule.occurrences_generated;

    loop
      due := public.recurring_occurrence_date(rule.start_date, rule.frequency, n);
      exit when due > current_date;

      insert into public.receipts (
        user_id, household_id, storage_path, merchant, amount, purchase_date,
        category, subcategory, notes, status, source, recurring_expense_id
      )
      values (
        rule.user_id, household, null, rule.title, rule.amount, due,
        rule.category, rule.subcategory, rule.notes, 'processed', 'recurring', rule.id
      )
      on conflict do nothing;

      if found then
        created := created + 1;
      end if;

      n := n + 1;
    end loop;

    update public.recurring_expenses set occurrences_generated = n where id = rule.id;
  end loop;

  return created;
end;
$$;

-- Callers must not be able to name a user: this wrapper always uses the
-- caller's own id. EXECUTE is granted to PUBLIC by default, so the core
-- generator is explicitly revoked.
create or replace function public.generate_my_recurring()
returns integer
language sql
security definer
set search_path = public
as $$
  select public._generate_recurring(auth.uid());
$$;

-- Revoking from PUBLIC alone is not enough here: Supabase's default
-- privileges hand EXECUTE to anon and authenticated directly, so without
-- these any signed-in user could trigger a full-table sweep.
revoke execute on function public._generate_recurring(uuid) from public, anon, authenticated;
grant execute on function public.generate_my_recurring() to authenticated;
grant execute on function public.resume_recurring_expense(uuid) to authenticated;

alter table public.recurring_expenses enable row level security;
grant select, insert, update, delete on public.recurring_expenses to authenticated;

-- Rules are personal even inside a household — only their creator sees or
-- edits them. What is shared is the generated expense, which carries
-- household_id like any other.
drop policy if exists "Users manage own recurring expenses" on public.recurring_expenses;
create policy "Users manage own recurring expenses"
  on public.recurring_expenses for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 02:00 UTC: early enough that a due expense is present before the owner
-- opens the app in the morning, and creating or resuming a rule generates
-- immediately rather than waiting for the next sweep.
do $$
begin
  perform cron.unschedule('snapbudget-generate-recurring');
exception
  when others then null;
end
$$;

select cron.schedule(
  'snapbudget-generate-recurring',
  '0 2 * * *',
  $$ select public._generate_recurring() $$
);
