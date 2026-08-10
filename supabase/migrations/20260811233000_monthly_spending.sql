-- Monthly spending aggregate (MAD-69): sums grouped by month and category,
-- computed in Postgres instead of by pulling rows into the Node process.
--
-- The dashboard's single-month view can keep fetching rows — it needs
-- individual expenses anyway, for the daily chart and the biggest-expense
-- card, and one or two months of rows is a bounded set. A twelve-month view
-- is not: over a shared household it grows without limit and would eventually
-- hit the 5000-row fetch cap, at which point the totals silently go wrong
-- rather than merely slow. Anything spanning many months goes through here.
--
-- security invoker, so row-level security still applies: a caller sees exactly
-- the expenses they could have selected directly — their own, plus their
-- household's.

create or replace function public.monthly_spending(
  _from date,
  _to date,
  _user_id uuid default null
)
returns table (month text, category text, total numeric)
language sql
security invoker
stable
set search_path = public
as $$
  select
    to_char(coalesce(r.purchase_date, (r.created_at at time zone 'UTC')::date), 'YYYY-MM'),
    coalesce(r.category, 'Altele'),
    sum(r.amount)
  from public.receipts r
  where r.status = 'processed'
    and r.amount is not null
    -- Manual and backdated entries can have no purchase_date and fall back to
    -- created_at, matching lib/dashboard/aggregate.ts. The UTC cast keeps that
    -- fallback identical to the JS side, which slices the ISO string and so is
    -- always reading a UTC date.
    and coalesce(r.purchase_date, (r.created_at at time zone 'UTC')::date) >= _from
    and coalesce(r.purchase_date, (r.created_at at time zone 'UTC')::date) < _to
    -- Null means "everything I can see", which for a household member is the
    -- pooled total. Passing an id narrows to one member, mirroring the
    -- dashboard's "who" filter.
    and (_user_id is null or r.user_id = _user_id)
  group by 1, 2;
$$;

grant execute on function public.monthly_spending(date, date, uuid) to authenticated;

-- Supports the range scan the function performs. The existing
-- receipts_purchase_date_idx does not, because the predicate is on the
-- coalesce expression rather than on purchase_date alone.
create index if not exists receipts_spent_on_idx
  on public.receipts (
    (coalesce(purchase_date, (created_at at time zone 'UTC')::date))
  )
  where status = 'processed' and amount is not null;
