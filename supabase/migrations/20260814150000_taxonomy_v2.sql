-- Category taxonomy, second pass.
--
-- Prompted by a phone top-up that had nowhere to go: the OCR rules filed
-- Orange under Casă → Utilități while the manual form had it under
-- Divertisment → Abonamente, so one expense had two homes and neither was
-- right. A prepaid top-up is neither a property of the dwelling nor
-- entertainment — it is a recurring bill, and that category did not exist.
--
-- The eight validated category hues are untouched. Labels changed, token
-- stems (food, transport, home, …) did not, so globals.css and the
-- deuteranopia-checked palette carry over exactly as they were.
--
-- Statement order is load-bearing. Everything keyed on an old category name
-- runs before the generic renames at the bottom, or the keys stop matching
-- halfway through.

-- ---------------------------------------------------------------------------
-- 1. Telecom leaves both of its old homes for its own subcategory.
-- ---------------------------------------------------------------------------
update public.receipts
   set category = 'Locuință & Facturi', subcategory = 'Telefon & Internet'
 where (
         (category = 'Divertisment' and subcategory = 'Abonamente')
      or (category = 'Casă' and subcategory = 'Utilități')
       )
   and coalesce(merchant, '') ~* '(vodafone|orange|telekom|\ydigi\y|rcs)';

update public.recurring_expenses
   set category = 'Locuință & Facturi', subcategory = 'Telefon & Internet'
 where (
         (category = 'Divertisment' and subcategory = 'Abonamente')
      or (category = 'Casă' and subcategory = 'Utilități')
       )
   and coalesce(title, '') ~* '(vodafone|orange|telekom|\ydigi\y|rcs)';

-- ---------------------------------------------------------------------------
-- 2. Pairs that move to a different category.
-- ---------------------------------------------------------------------------
-- "Abonamente" named a payment shape rather than a kind of spending, so it
-- attracted anything monthly. What is left of it after telecom is streaming.
update public.receipts set subcategory = 'Streaming & Media'
 where category = 'Divertisment' and subcategory = 'Abonamente';
update public.recurring_expenses set subcategory = 'Streaming & Media'
 where category = 'Divertisment' and subcategory = 'Abonamente';

-- Furniture is a purchase, not a housing cost; housing keeps only what it
-- costs to live there.
update public.receipts set category = 'Cumpărături', subcategory = 'Casă & Decor'
 where category = 'Casă' and subcategory = 'Mobilă & Electrocasnice';
update public.recurring_expenses set category = 'Cumpărături', subcategory = 'Casă & Decor'
 where category = 'Casă' and subcategory = 'Mobilă & Electrocasnice';

-- Gifts are frequent and recognisable, which is exactly what the residual
-- bucket is not for.
update public.receipts set category = 'Cumpărături'
 where category = 'Altele' and subcategory = 'Cadouri';
update public.recurring_expenses set category = 'Cumpărături'
 where category = 'Altele' and subcategory = 'Cadouri';

-- Ridesharing splits off from the metro pass, recovered from the merchant
-- because the old bucket held both.
update public.receipts set subcategory = 'Taxi & Ridesharing'
 where category = 'Transport' and subcategory = 'Transport public'
   and coalesce(merchant, '') ~* '(\yuber\y|\ybolt\y|taxi)';
update public.recurring_expenses set subcategory = 'Taxi & Ridesharing'
 where category = 'Transport' and subcategory = 'Transport public'
   and coalesce(title, '') ~* '(\yuber\y|\ybolt\y|taxi)';

-- ---------------------------------------------------------------------------
-- 3. Subcategories renamed in place, keyed on the old category name.
-- ---------------------------------------------------------------------------
update public.receipts set subcategory = 'Parcare & Drum'
 where category = 'Transport' and subcategory = 'Parcare & Taxe drum';
update public.recurring_expenses set subcategory = 'Parcare & Drum'
 where category = 'Transport' and subcategory = 'Parcare & Taxe drum';

update public.receipts set subcategory = 'Întreținere & Reparații'
 where category = 'Casă' and subcategory = 'Renovări';
update public.recurring_expenses set subcategory = 'Întreținere & Reparații'
 where category = 'Casă' and subcategory = 'Renovări';

update public.receipts set subcategory = 'Sport & Fitness'
 where category = 'Sănătate' and subcategory = 'Fitness';
update public.recurring_expenses set subcategory = 'Sport & Fitness'
 where category = 'Sănătate' and subcategory = 'Fitness';

update public.receipts set subcategory = 'Îmbrăcăminte & Încălțăminte'
 where category = 'Cumpărături' and subcategory = 'Îmbrăcăminte';
update public.recurring_expenses set subcategory = 'Îmbrăcăminte & Încălțăminte'
 where category = 'Cumpărături' and subcategory = 'Îmbrăcăminte';

update public.receipts set subcategory = 'Educație & Cursuri'
 where category = 'Familie' and subcategory = 'Educație';
update public.recurring_expenses set subcategory = 'Educație & Cursuri'
 where category = 'Familie' and subcategory = 'Educație';

update public.receipts set subcategory = 'Călătorii & Cazare'
 where category = 'Divertisment' and subcategory = 'Călătorii & Timp liber';
update public.recurring_expenses set subcategory = 'Călătorii & Cazare'
 where category = 'Divertisment' and subcategory = 'Călătorii & Timp liber';

update public.receipts set subcategory = 'Taxe & Impozite'
 where category = 'Financiar' and subcategory = 'Taxe';
update public.recurring_expenses set subcategory = 'Taxe & Impozite'
 where category = 'Financiar' and subcategory = 'Taxe';

-- ---------------------------------------------------------------------------
-- 4. Subcategories that no longer exist. The rows keep their category — the
--    label is gone, the expense still happened, and guessing a replacement
--    would be inventing data.
-- ---------------------------------------------------------------------------
-- A withdrawal is a transfer, not spending: it was counted once leaving the
-- account and again when the cash was spent, so the month read high. New
-- entries can no longer choose it.
update public.receipts set subcategory = null
 where category = 'Altele' and subcategory = 'Retragere numerar';
update public.recurring_expenses set subcategory = null
 where category = 'Altele' and subcategory = 'Retragere numerar';

-- Second residual bucket, doing the same job as Altele → Neclasificat while
-- sharing a name with its own parent category.
update public.receipts set subcategory = null
 where category = 'Cumpărături' and subcategory = 'Cumpărături generale';
update public.recurring_expenses set subcategory = null
 where category = 'Cumpărături' and subcategory = 'Cumpărături generale';

-- ---------------------------------------------------------------------------
-- 5. Category renames. Last, for the reason given at the top.
-- ---------------------------------------------------------------------------
update public.receipts set category = 'Locuință & Facturi' where category = 'Casă';
update public.receipts set category = 'Sănătate & Îngrijire' where category = 'Sănătate';
update public.receipts set category = 'Familie & Educație' where category = 'Familie';

update public.recurring_expenses set category = 'Locuință & Facturi' where category = 'Casă';
update public.recurring_expenses set category = 'Sănătate & Îngrijire' where category = 'Sănătate';
update public.recurring_expenses set category = 'Familie & Educație' where category = 'Familie';

-- Budgets carry a category but no subcategory.
update public.budgets set category = 'Locuință & Facturi' where category = 'Casă';
update public.budgets set category = 'Sănătate & Îngrijire' where category = 'Sănătate';
update public.budgets set category = 'Familie & Educație' where category = 'Familie';
