/**
 * Chains recognisable from anywhere in a receipt's text, with the name to
 * store when one is found.
 *
 * This exists because the printed header is the least reliable part of a
 * receipt. Real examples from the app's own data: a fuel receipt whose first
 * line was the card terminal id `ITD WID: SKBEISH2` whilst `ROMPETROL` sat
 * four lines down, and a restaurant bill headed `Masa: 55` — a table number.
 * A brand appearing anywhere in the text beats whatever landed on line one.
 *
 * Distinct from the patterns in lib/categorization/categorize.ts, which
 * answer a different question: those include generic words ("restaurant",
 * "farmacie") that classify but do not name, and several brands there share
 * one category. These are only ever used to produce a display name.
 */
export interface KnownMerchant {
  /** Stored verbatim as the merchant, so it is spelled the way a person would. */
  name: string;
  pattern: RegExp;
}

export const KNOWN_MERCHANTS: readonly KnownMerchant[] = [
  // Grocery
  { name: 'Kaufland', pattern: /kaufland/i },
  { name: 'Lidl', pattern: /\blidl\b/i },
  { name: 'Profi', pattern: /\bprofi\b/i },
  { name: 'Mega Image', pattern: /mega\s?image/i },
  { name: 'Carrefour', pattern: /carrefour/i },
  { name: 'Auchan', pattern: /auchan/i },
  { name: 'Penny', pattern: /\bpenny\b/i },
  { name: 'Selgros', pattern: /selgros/i },
  { name: 'Metro', pattern: /\bmetro\b/i },
  { name: 'Cora', pattern: /\bcora\b/i },

  // Fuel
  { name: 'Rompetrol', pattern: /rompetrol/i },
  { name: 'OMV', pattern: /\bomv\b/i },
  { name: 'Petrom', pattern: /petrom/i },
  { name: 'MOL', pattern: /\bmol\b/i },
  { name: 'Lukoil', pattern: /lukoil/i },
  { name: 'Socar', pattern: /socar/i },

  // Electronics & home
  { name: 'eMAG', pattern: /\bemag\b/i },
  { name: 'Altex', pattern: /\baltex\b/i },
  { name: 'Media Galaxy', pattern: /media\s?galaxy/i },
  { name: 'Flanco', pattern: /flanco/i },
  { name: 'Dedeman', pattern: /dedeman/i },
  { name: 'Leroy Merlin', pattern: /leroy\s?merlin/i },
  { name: 'Hornbach', pattern: /hornbach/i },
  { name: 'Brico Depôt', pattern: /brico\s?dep[oô]t/i },
  { name: 'IKEA', pattern: /\bikea\b/i },
  { name: 'JYSK', pattern: /\bjysk\b/i },
  { name: 'Mobexpert', pattern: /mobexpert/i },

  // Pharmacy & health
  { name: 'Sensiblu', pattern: /sensiblu/i },
  { name: 'Catena', pattern: /catena/i },
  { name: 'Dr. Max', pattern: /\bdr\.?\s?max\b/i },
  { name: 'Help Net', pattern: /help\s?net/i },
  { name: 'Regina Maria', pattern: /regina\s?maria/i },
  { name: 'MedLife', pattern: /medlife/i },

  // Clothing & sport
  { name: 'H&M', pattern: /\bh\s?&\s?m\b/i },
  { name: 'Zara', pattern: /\bzara\b/i },
  { name: 'C&A', pattern: /\bc\s?&\s?a\b/i },
  { name: 'LC Waikiki', pattern: /lc\s?waikiki/i },
  { name: 'Deichmann', pattern: /deichmann/i },
  { name: 'Decathlon', pattern: /decathlon/i },

  // Food & delivery
  { name: 'Starbucks', pattern: /starbucks/i },
  { name: "McDonald's", pattern: /mcdonald/i },
  { name: 'KFC', pattern: /\bkfc\b/i },
  { name: '5 to go', pattern: /5\s?to\s?go/i },
  { name: 'Glovo', pattern: /glovo/i },
  { name: 'Tazz', pattern: /\btazz\b/i },
];

/**
 * The brand printed highest on the receipt wins.
 *
 * Position, not list order, decides — a Profi receipt carries the logo at the
 * top and `MEGA IMAGE SRL` in the fiscal block below, and the shop the person
 * actually walked into is the one on the sign.
 */
export function matchKnownMerchant(text: string): string | null {
  let best: { name: string; index: number } | null = null;

  for (const { name, pattern } of KNOWN_MERCHANTS) {
    const match = text.match(pattern);
    if (match?.index === undefined) continue;
    if (!best || match.index < best.index) best = { name, index: match.index };
  }

  return best?.name ?? null;
}
