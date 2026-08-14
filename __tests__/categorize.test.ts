import { describe, expect, it } from 'vitest';
import { categorizeMerchant, suggestCategory } from '@/lib/categorization/categorize';
import { CATEGORIES, SUBCATEGORIES, isSubcategoryOf, type Category } from '@/lib/categories';

describe('taxonomy integrity', () => {
  it('gives every category a subcategory list', () => {
    for (const category of CATEGORIES) {
      expect(SUBCATEGORIES[category].length).toBeGreaterThan(0);
    }
  });

  it('never repeats a subcategory name across categories', () => {
    // Two categories offering the same label makes the picker ambiguous at
    // exactly the moment the user was already unsure where something goes.
    const seen = new Map<string, Category>();
    for (const category of CATEGORIES) {
      for (const sub of SUBCATEGORIES[category]) {
        expect(seen.has(sub), `"${sub}" appears under two categories`).toBe(false);
        seen.set(sub, category);
      }
    }
  });

  it('never names a subcategory after its own parent', () => {
    for (const category of CATEGORIES) {
      for (const sub of SUBCATEGORIES[category]) {
        expect(sub).not.toBe(category);
      }
    }
  });
});

describe('merchant categorization', () => {
  it('sends every rule to a subcategory that actually exists', () => {
    // The rules and the taxonomy are two lists that have to agree; a rename on
    // one side used to be discoverable only by filing an expense and looking.
    const merchants = [
      'Glovo',
      'Starbucks',
      'KFC',
      'Kaufland',
      'OMV',
      'Uber',
      'Metrorex',
      'Parcare Stadion',
      'Service Auto Ilie',
      'Vodafone',
      'Enel',
      'Dedeman',
      'Catena',
      'MedLife',
      'World Class',
      'Frizerie Centru',
      'eMag',
      'Zara',
      'IKEA',
      'Maxi Zoo',
      'Udemy',
      'Netflix',
      'Cinema City',
      'Booking.com',
      'iaBilet',
      'BCR',
      'Allianz',
      'ANAF',
    ];

    for (const merchant of merchants) {
      const { category, subcategory } = categorizeMerchant(merchant);
      expect(CATEGORIES).toContain(category);
      expect(subcategory, `${merchant} matched no rule`).not.toBeNull();
      expect(
        isSubcategoryOf(category, subcategory),
        `${merchant} → ${category} / ${subcategory} is not a valid pair`,
      ).toBe(true);
    }
  });

  it('files a phone top-up as a bill, not as a utility or a subscription', () => {
    // The case the whole taxonomy pass came from.
    for (const merchant of ['Orange', 'Vodafone', 'Telekom', 'Reincarcare cartela']) {
      expect(categorizeMerchant(merchant)).toEqual({
        category: 'Locuință & Facturi',
        subcategory: 'Telefon & Internet',
      });
    }
  });

  it('keeps meters apart from telecom', () => {
    expect(categorizeMerchant('Enel Energie')).toEqual({
      category: 'Locuință & Facturi',
      subcategory: 'Utilități',
    });
  });

  it('separates ridesharing from public transport', () => {
    expect(categorizeMerchant('Uber Trip').subcategory).toBe('Taxi & Ridesharing');
    expect(categorizeMerchant('Bolt').subcategory).toBe('Taxi & Ridesharing');
    expect(categorizeMerchant('Metrorex').subcategory).toBe('Transport public');
  });

  it('still reads Bolt Food as delivery rather than as a ride', () => {
    // Ordering guard: the food rule has to stay above the ridesharing one.
    expect(categorizeMerchant('Bolt Food')).toEqual({
      category: 'Mâncare & Băutură',
      subcategory: 'Livrare mâncare',
    });
  });

  it('falls back to the residual bucket without inventing a subcategory', () => {
    expect(categorizeMerchant('Ceva Necunoscut SRL')).toEqual({
      category: 'Altele',
      subcategory: null,
    });
    expect(categorizeMerchant(null)).toEqual({ category: 'Altele', subcategory: null });
  });
});

describe('suggestCategory', () => {
  it('reports a miss instead of defaulting', () => {
    // The manual form shows the result to the user, so "recognised nothing"
    // has to be distinguishable from "recognised it as Altele".
    expect(suggestCategory('Ceva Necunoscut SRL')).toBeNull();
    expect(suggestCategory('')).toBeNull();
    expect(suggestCategory(null)).toBeNull();
  });

  it('agrees with categorizeMerchant wherever a rule matches', () => {
    for (const merchant of ['Orange', 'Lidl', 'Uber', 'Netflix', 'ANAF', 'Bolt Food']) {
      expect(suggestCategory(merchant)).toEqual(categorizeMerchant(merchant));
    }
  });

  it('recognises a partially typed merchant', () => {
    // It runs on every keystroke, so it has to behave on half-finished input
    // rather than only on a complete merchant name.
    expect(suggestCategory('oran')).toBeNull();
    expect(suggestCategory('orange')?.subcategory).toBe('Telefon & Internet');
    expect(suggestCategory('Orange Romania SA')?.subcategory).toBe('Telefon & Internet');
  });
});
