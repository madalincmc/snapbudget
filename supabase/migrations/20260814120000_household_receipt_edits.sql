-- Household co-members can edit and delete each other's expenses.
--
-- Until now SELECT covered the whole household but UPDATE and DELETE stayed
-- creator-only. That asymmetry did not read as "not allowed" — it read as a
-- broken app: Postgres does not raise on a DELETE that matches zero rows, so
-- PostgREST answered 200 with no error, the UI dropped the row optimistically,
-- and the expense came back on the next load with the month total untouched.
--
-- Making the two symmetric is also the right rule for the feature: a shared
-- household budget is one pot, and whoever is looking at a wrong entry should
-- be able to fix it, not just the person who happened to snap the receipt.
-- Follows the precedent already set for household budgets (MAD-67).

drop policy if exists "Users can update own receipts" on public.receipts;
drop policy if exists "Users can update own or household receipts" on public.receipts;
create policy "Users can update own or household receipts"
  on public.receipts for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (household_id is not null and public.is_household_member(household_id))
  )
  -- The same test after the write, so an edit cannot push a row somewhere the
  -- editor could no longer reach it: detaching another member's receipt from
  -- the household (household_id -> null) leaves a row whose user_id is not the
  -- editor's, which fails this check and rolls the update back.
  with check (
    (select auth.uid()) = user_id
    or (household_id is not null and public.is_household_member(household_id))
  );

drop policy if exists "Users can delete own receipts" on public.receipts;
drop policy if exists "Users can delete own or household receipts" on public.receipts;
create policy "Users can delete own or household receipts"
  on public.receipts for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (household_id is not null and public.is_household_member(household_id))
  );

-- Storage has to follow, or deleting a co-member's receipt would drop the row
-- and orphan its photo in the bucket, where nothing would ever reference it
-- again. Read access was already widened to co-member folders in MAD-61.
drop policy if exists "Users can delete own receipt files" on storage.objects;
drop policy if exists "Users can delete own or household receipt files" on storage.objects;
create policy "Users can delete own or household receipt files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.is_household_co_member_folder((storage.foldername(name))[1])
    )
  );
