'use client';

import { useEffect, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORIES, SUBCATEGORIES, type Category } from '@/lib/categories';

const RECENTS_KEY = 'snapbudget:recent-categories';
const MAX_RECENTS = 5;

export interface CategoryValue {
  category: Category;
  subcategory: string | null;
}

function optionKey(value: CategoryValue) {
  return `${value.category}::${value.subcategory ?? ''}`;
}

function optionLabel(value: CategoryValue) {
  return value.subcategory ? `${value.category} · ${value.subcategory}` : value.category;
}

function loadRecents(): CategoryValue[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(value: CategoryValue) {
  const recents = loadRecents().filter((r) => optionKey(r) !== optionKey(value));
  recents.unshift(value);
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

interface CategoryPickerProps {
  defaultCategory: Category;
  defaultSubcategory?: string | null;
  categoryName?: string;
  subcategoryName?: string;
  /** Controlled mode. Pass both to drive the value from outside — the manual
   *  expense form does, so a merchant typed above can propose a category here.
   *  Left out, the picker keeps its own state as before. */
  value?: CategoryValue;
  onValueChange?: (value: CategoryValue) => void;
}

export function CategoryPicker({
  defaultCategory,
  defaultSubcategory = null,
  categoryName = 'category',
  subcategoryName = 'subcategory',
  value: controlledValue,
  onValueChange,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [ownValue, setOwnValue] = useState<CategoryValue>({
    category: defaultCategory,
    subcategory: defaultSubcategory,
  });
  const [recents, setRecents] = useState<CategoryValue[]>([]);

  const value = controlledValue ?? ownValue;

  useEffect(() => {
    // Reads localStorage, unavailable during SSR/initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(loadRecents());
  }, []);

  function handleSelect(next: CategoryValue) {
    if (controlledValue === undefined) setOwnValue(next);
    onValueChange?.(next);
    saveRecent(next);
    setRecents(loadRecents());
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name={categoryName} value={value.category} />
      <input type="hidden" name={subcategoryName} value={value.subcategory ?? ''} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {optionLabel(value)}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[--anchor-width] p-0">
          <Command>
            <CommandInput placeholder="Caută o categorie…" />
            <CommandList>
              <CommandEmpty>Nicio categorie găsită.</CommandEmpty>

              {recents.length > 0 && (
                <CommandGroup heading="Recente">
                  {recents.map((r) => (
                    <CommandItem
                      key={`recent-${optionKey(r)}`}
                      value={`recent ${optionLabel(r)}`}
                      data-checked={optionKey(value) === optionKey(r)}
                      onSelect={() => handleSelect(r)}
                    >
                      {optionLabel(r)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {CATEGORIES.map((category) => (
                <CommandGroup key={category} heading={category}>
                  <CommandItem
                    value={`${category} general`}
                    data-checked={optionKey(value) === optionKey({ category, subcategory: null })}
                    onSelect={() => handleSelect({ category, subcategory: null })}
                  >
                    {category} (general)
                  </CommandItem>
                  {SUBCATEGORIES[category].map((subcategory) => (
                    <CommandItem
                      key={`${category}-${subcategory}`}
                      value={`${category} ${subcategory}`}
                      data-checked={optionKey(value) === optionKey({ category, subcategory })}
                      onSelect={() => handleSelect({ category, subcategory })}
                    >
                      {subcategory}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
