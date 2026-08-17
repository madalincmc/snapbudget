-- Invitations expire (MAD-75). An emailed link that never goes stale is a
-- standing key to a household: forwarded, leaked or simply forgotten, it would
-- still let someone in months later. Seven days is long enough to act on and
-- short enough that last month's mail is inert.
--
-- Expiry is a separate column rather than a status, because a row can be
-- pending and expired at the same time and both facts matter — the household
-- screen still lists it, and resending it is what makes it live again.

alter table public.household_invitations
  add column if not exists expires_at timestamptz;

-- Backfilled from created_at rather than now(), so invitations already sitting
-- in the table get the expiry they would have had, not a fresh week.
update public.household_invitations
   set expires_at = created_at + interval '7 days'
 where expires_at is null;

alter table public.household_invitations
  alter column expires_at set default (now() + interval '7 days');

alter table public.household_invitations
  alter column expires_at set not null;

-- The pending list reads it on every household screen render.
create index if not exists household_invitations_pending_expires_idx
  on public.household_invitations (expires_at)
  where status = 'pending';
