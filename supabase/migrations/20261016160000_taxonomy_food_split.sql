-- Category taxonomy, third pass (MAD-148): "Mâncare & Băutură" is dissolved.
--
-- It grouped spending by what was eaten rather than by what kind of spending
-- it was. A weekly shop at Lidl and a dinner out have little in common
-- beyond the food: one is a staple, bought like anything else in a shop; the
-- other is going out. So groceries join Cumpărături, and eating out joins
-- Divertisment, renamed to say it now covers going out as well.
--
--   Mâncare & Băutură (no subcategory) → Cumpărături / Supermarket & Piață
--   Mâncare & Băutură / Alimente       → Cumpărături / Supermarket & Piață
--   Mâncare & Băutură / Restaurante    → Divertisment & Ieșiri / Restaurante
--   Mâncare & Băutură / Cafea & Gustări → Divertisment & Ieșiri / (same)
--   Mâncare & Băutură / Livrare mâncare → Divertisment & Ieșiri / (same)
--   Divertisment                        → Divertisment & Ieșiri
--
-- Statement order is load-bearing, as in taxonomy_v2: the eating-out moves
-- are keyed on their subcategory and must run before the catch-all that
-- sends whatever is left of the category to Cumpărături.

begin;

-- ---------------------------------------------------------------------------
-- 1. Eating out → Divertisment & Ieșiri, subcategory unchanged.
-- ---------------------------------------------------------------------------
update public.receipts set category = 'Divertisment & Ieșiri'
 where category = 'Mâncare & Băutură'
   and subcategory in ('Restaurante', 'Cafea & Gustări', 'Livrare mâncare');
update public.recurring_expenses set category = 'Divertisment & Ieșiri'
 where category = 'Mâncare & Băutură'
   and subcategory in ('Restaurante', 'Cafea & Gustări', 'Livrare mâncare');

-- ---------------------------------------------------------------------------
-- 2. Everything else left in the category is groceries. At the time of
--    writing that is exactly "Alimente" and no subcategory; a stray value
--    from before subcategories were validated goes the same way rather than
--    staying in a category that no longer exists.
-- ---------------------------------------------------------------------------
update public.receipts set category = 'Cumpărături', subcategory = 'Supermarket & Piață'
 where category = 'Mâncare & Băutură';
update public.recurring_expenses set category = 'Cumpărături', subcategory = 'Supermarket & Piață'
 where category = 'Mâncare & Băutură';

-- ---------------------------------------------------------------------------
-- 3. Budgets. They carry a category but no subcategory, and there is one per
--    (scope, category) — see the partial unique indexes in the budgets
--    migration. A food limit therefore becomes the Cumpărături limit, unless
--    that scope already has one, in which case the two are added together:
--    the food money now counts towards Cumpărături, so the limit has to grow
--    by the same amount or a household that was within both would suddenly
--    read as over.
-- ---------------------------------------------------------------------------
update public.budgets shopping
   set amount = shopping.amount + food.amount
  from public.budgets food
 where food.category = 'Mâncare & Băutură'
   and shopping.category = 'Cumpărături'
   and (
         (food.household_id is null and shopping.household_id is null
          and food.user_id = shopping.user_id)
      or (food.household_id is not null and food.household_id = shopping.household_id)
       );

delete from public.budgets food
 using public.budgets shopping
 where food.category = 'Mâncare & Băutură'
   and shopping.category = 'Cumpărături'
   and (
         (food.household_id is null and shopping.household_id is null
          and food.user_id = shopping.user_id)
      or (food.household_id is not null and food.household_id = shopping.household_id)
       );

update public.budgets set category = 'Cumpărături' where category = 'Mâncare & Băutură';

-- ---------------------------------------------------------------------------
-- 4. The rename. Last.
-- ---------------------------------------------------------------------------
update public.receipts set category = 'Divertisment & Ieșiri' where category = 'Divertisment';
update public.recurring_expenses set category = 'Divertisment & Ieșiri' where category = 'Divertisment';
update public.budgets set category = 'Divertisment & Ieșiri' where category = 'Divertisment';

commit;
