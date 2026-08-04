-- Household sharing (MAD-61): a household has one owner and multiple
-- members; a member joins by accepting an email invitation after signing
-- in with their own Google account. Expenses gain an optional household_id
-- so members can see each other's spending; user_id already always equals
-- the creator (every insert in the app sets it explicitly), so it doubles
-- as expense attribution — no separate created_by column needed.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One household per user for now (MVP scope) — join a second household by
-- leaving the first.
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  display_name text,
  avatar_url text,
  email text,
  joined_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'declined')),
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- Only one live invitation per (household, email) at a time.
create unique index if not exists household_invitations_pending_unique
  on public.household_invitations (household_id, email)
  where status = 'pending';

create index if not exists household_members_household_id_idx
  on public.household_members (household_id);
create index if not exists household_invitations_household_id_idx
  on public.household_invitations (household_id);
create index if not exists household_invitations_email_idx
  on public.household_invitations (email);

alter table public.receipts add column if not exists household_id uuid references public.households (id) on delete set null;
create index if not exists receipts_household_id_idx on public.receipts (household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;

-- Data API is not auto-exposed for new tables by default; grant explicitly.
grant select, insert on public.households to authenticated;
grant select, insert, delete on public.household_members to authenticated;
grant select, insert, update on public.household_invitations to authenticated;

-- Every helper below is `security definer` for two distinct reasons:
--   1. a self-referencing policy on household_members would recurse (the
--      policy's own subquery would re-trigger the same policy);
--   2. less obviously, a policy's subquery is itself subject to the queried
--      table's RLS — so "may I join the household I was invited to" would be
--      filtered to zero rows before the check could ever pass.
create or replace function public.is_household_member(_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = _household_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = _household_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- "Did I create this household row?" — distinct from is_household_owner,
-- which reads the roster. During createHousehold the roster row does not
-- exist yet, so the owner check has to come off households.owner_id.
create or replace function public.owns_household_record(_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.households
    where id = _household_id and owner_id = auth.uid()
  );
$$;

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
      and lower(email) = lower(auth.jwt() ->> 'email')
      and status = _status
  );
$$;

-- Used by the storage policy below: "does this other user share a
-- household with me", so co-members can view each other's receipt photos.
create or replace function public.is_household_co_member(_other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members m1
    join public.household_members m2 on m1.household_id = m2.household_id
    where m1.user_id = auth.uid() and m2.user_id = _other_user_id
  );
$$;

-- Storage object names are `<user_id>/<uuid>.<ext>`, but nothing at the
-- database level guarantees that first segment is a uuid. CASE gives us a
-- guaranteed short-circuit so a malformed name can never raise a cast error
-- mid-policy (a bare `AND` has no evaluation-order guarantee).
create or replace function public.is_household_co_member_folder(_folder text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when _folder ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then public.is_household_co_member(_folder::uuid)
    else false
  end;
$$;

-- SELECT must cover the creator directly, not just roster members:
-- PostgREST turns `.select()` after an insert into INSERT ... RETURNING,
-- which re-checks the new row against the SELECT policy. At that instant
-- the creator has no membership row — there is no household to be a member
-- of until this very insert lands. Invitees are included too, so the
-- pending-invitation banner can read the household's name.
create policy "Owner, members and invitees can view a household"
  on public.households for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_household_member(id)
    or public.has_invitation(id, 'pending')
  );

create policy "Users can create a household they own"
  on public.households for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Members can view their household roster"
  on public.household_members for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_household_member(household_id));

-- Self-insert only: either claiming ownership of a household you just
-- created, or joining one via an invitation you have already accepted (see
-- the acceptInvitation server action, which flips the invitation to
-- 'accepted' before inserting the membership row).
create policy "Users can join a household as owner or invited member"
  on public.household_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (role = 'owner' and public.owns_household_record(household_id))
      or (role = 'member' and public.has_invitation(household_id, 'accepted'))
    )
  );

create policy "Owner removes a member, or a member leaves"
  on public.household_members for delete
  to authenticated
  using (
    (public.is_household_owner(household_id) and user_id <> (select auth.uid()))
    or (role = 'member' and user_id = (select auth.uid()))
  );

-- Leaving spends the invitation. Without this an accepted invitation stays
-- accepted forever, and the insert policy above would happily let a removed
-- member re-add themselves — removal has to actually stick, so re-joining
-- needs a fresh invite. Enforced by trigger rather than in removeMember(),
-- so it holds for direct API calls too.
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
     and lower(email) = lower(coalesce(
           old.email,
           (select u.email from auth.users u where u.id = old.user_id)
         ));
  return old;
end;
$$;

drop trigger if exists household_members_revoke_invitation on public.household_members;
create trigger household_members_revoke_invitation
  after delete on public.household_members
  for each row execute function public.revoke_invitation_on_leave();

create policy "Owner or invitee can view an invitation"
  on public.household_invitations for select
  to authenticated
  using (
    public.is_household_owner(household_id)
    or public.owns_household_record(household_id)
    or lower(email) = lower((select auth.jwt() ->> 'email'))
  );

create policy "Owner sends invitations"
  on public.household_invitations for insert
  to authenticated
  with check (
    (public.is_household_owner(household_id) or public.owns_household_record(household_id))
    and invited_by = (select auth.uid())
  );

create policy "Owner cancels, invitee accepts or declines"
  on public.household_invitations for update
  to authenticated
  using (
    public.is_household_owner(household_id)
    or lower(email) = lower((select auth.jwt() ->> 'email'))
  )
  with check (
    public.is_household_owner(household_id)
    or lower(email) = lower((select auth.jwt() ->> 'email'))
  );

-- Receipts: broaden select/insert to household co-members; update/delete
-- stay creator-only (members edit their own expenses, per MAD-61 scope).
drop policy if exists "Users can view own receipts" on public.receipts;
drop policy if exists "Users can view own or household receipts" on public.receipts;
create policy "Users can view own or household receipts"
  on public.receipts for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (household_id is not null and public.is_household_member(household_id))
  );

drop policy if exists "Users can insert own receipts" on public.receipts;
create policy "Users can insert own receipts"
  on public.receipts for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (household_id is null or public.is_household_member(household_id))
  );

-- Storage: let household co-members read each other's receipt photos too.
drop policy if exists "Users can read own receipt files" on storage.objects;
drop policy if exists "Users can read own or household receipt files" on storage.objects;
create policy "Users can read own or household receipt files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.is_household_co_member_folder((storage.foldername(name))[1])
    )
  );
