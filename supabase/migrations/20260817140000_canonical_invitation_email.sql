-- Invitations are matched by mailbox, not by spelling (MAD-78).
--
-- Gmail ignores dots in the local part and everything after a "+", so
-- madalin.cotetiu@gmail.com, madalincotetiu@gmail.com and
-- madalin+snap@gmail.com are one inbox. The app compared the address as a
-- string, so an invitation was delivered by Gmail's rules and matched by ours,
-- and the two disagreed: the mail arrived and the invitation could not be
-- accepted.
--
-- Checked before writing this: Google does NOT canonicalise the address it
-- reports. auth.users holds nichita.rares@gmail.com, dot and all, so the JWT
-- carries whatever spelling the account was registered under. Normalising only
-- on the way in would therefore have fixed one direction and left the other —
-- both sides have to be canonicalised at the point of comparison.

create or replace function public.canonical_email(_email text)
returns text
language sql
immutable
as $$
  select case
    -- Only Google. Everywhere else a dot is a significant character, and
    -- stripping it would silently point an invitation at a different person.
    when lower(split_part(_email, '@', 2)) in ('gmail.com', 'googlemail.com')
      then replace(split_part(lower(split_part(_email, '@', 1)), '+', 1), '.', '')
           || '@gmail.com'
    else lower(_email)
  end;
$$;

-- Generated rather than normalised on insert, so the address the owner typed
-- survives for the screen to show while matching happens on the mailbox — and
-- so the two can never drift, which they would if a future insert path forgot
-- to normalise.
alter table public.household_invitations
  add column if not exists email_canonical text
    generated always as (public.canonical_email(email)) stored;

create index if not exists household_invitations_email_canonical_idx
  on public.household_invitations (email_canonical);

-- One live invitation per mailbox, not per spelling: without this, inviting
-- both spellings of the same address would leave two pending rows and two
-- working links for one person.
drop index if exists household_invitations_pending_unique;
create unique index if not exists household_invitations_pending_unique
  on public.household_invitations (household_id, email_canonical)
  where status = 'pending';

-- Every place that asks "is this invitation mine?" now asks it of the mailbox.

create or replace function public.has_invitation(_household_id uuid, _status text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_invitations
    where household_id = _household_id
      and email_canonical = public.canonical_email(auth.jwt() ->> 'email')
      and status = _status
  );
$$;

create or replace function public.revoke_invitation_on_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.household_invitations
     set status = 'cancelled', responded_at = now()
   where household_id = old.household_id
     and status = 'accepted'
     and email_canonical = public.canonical_email(coalesce(
           old.email,
           (select u.email from auth.users u where u.id = old.user_id)
         ));
  return old;
end;
$$;

drop policy if exists "Owner or invitee can view an invitation" on public.household_invitations;
create policy "Owner or invitee can view an invitation"
  on public.household_invitations for select
  to authenticated
  using (
    public.is_household_owner(household_id)
    or public.owns_household_record(household_id)
    or email_canonical = public.canonical_email((select auth.jwt() ->> 'email'))
  );

drop policy if exists "Owner cancels, invitee accepts or declines" on public.household_invitations;
create policy "Owner cancels, invitee accepts or declines"
  on public.household_invitations for update
  to authenticated
  using (
    public.is_household_owner(household_id)
    or email_canonical = public.canonical_email((select auth.jwt() ->> 'email'))
  )
  with check (
    public.is_household_owner(household_id)
    or email_canonical = public.canonical_email((select auth.jwt() ->> 'email'))
  );
