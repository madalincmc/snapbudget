'use client';

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryPicker, type CategoryValue } from '@/components/category-picker';
import { suggestCategory } from '@/lib/categorization/categorize';

const FALLBACK: CategoryValue = { category: 'Altele', subcategory: null };

/**
 * Merchant and category, wired together.
 *
 * They used to be two independent fields, and the gap between them is how one
 * expense ended up with two different categories: the rules ran on photographed
 * receipts only, so anything typed by hand took whatever the picker happened to
 * be showing. A phone top-up entered manually went to Divertisment while the
 * same merchant read off a receipt went to the utilities bucket.
 *
 * The merchant sits above the category deliberately. With the category first,
 * the suggestion could only ever arrive after the choice had been made — either
 * too late to help or overwriting an answer the user had already given.
 */
export function ManualExpenseFields() {
  const [merchant, setMerchant] = useState('');
  // Null until the user opens the picker. An explicit choice outranks the rules
  // from then on, including after further typing: having been overruled once,
  // proposing again would read as the form arguing back.
  const [picked, setPicked] = useState<CategoryValue | null>(null);

  const suggestion = useMemo(() => suggestCategory(merchant.trim()), [merchant]);
  const value = picked ?? suggestion ?? FALLBACK;
  const showSuggestion = picked === null && suggestion !== null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="merchant">Comerciant / titlu (opțional)</Label>
        <Input
          id="merchant"
          name="merchant"
          placeholder="ex: Parcare centru"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Categorie — obligatoriu</Label>
        <CategoryPicker
          defaultCategory="Altele"
          value={value}
          onValueChange={(next) => setPicked(next)}
        />
        {/* Polite, so the category changing under the cursor is announced
            rather than silently swapped for anyone not watching the button. */}
        <p aria-live="polite" className="text-muted-foreground min-h-4 text-xs">
          {showSuggestion && (
            <span className="flex items-center gap-1">
              <Sparkles className="size-3" aria-hidden />
              Completat din „{merchant.trim()}”. Schimb-o dacă nu e corectă.
            </span>
          )}
        </p>
      </div>
    </>
  );
}
