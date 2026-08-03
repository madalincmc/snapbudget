-- MAD-60: expand the flat 5-category system into main category +
-- optional subcategory. Existing rows are remapped to a valid main
-- category in the new taxonomy; nothing is dropped, and rows that
-- carried real information in "Electronice" keep it as a subcategory.
alter table public.receipts add column if not exists subcategory text;

-- 'Transport', 'Casă', and 'Altele' are unchanged main-category names in
-- the new taxonomy, so only 'Mâncare' and 'Electronice' need remapping.
update public.receipts set category = 'Mâncare & Băutură' where category = 'Mâncare';

update public.receipts
set category = 'Cumpărături', subcategory = 'Electronice'
where category = 'Electronice';
