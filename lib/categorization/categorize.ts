import type { Category } from '@/lib/categories';

const RULES: Array<[Category, RegExp]> = [
  [
    'Mâncare',
    /kaufland|lidl|mega\s?image|carrefour|profi|auchan|penny|pizza|kfc|mcdonald|shaorma|patiserie|brut[ăa]rie|restaurant/i,
  ],
  [
    'Transport',
    /\bomv\b|petrom|rompetrol|\bmol\b|lukoil|socar|uber|bolt|\btaxi\b|\bcfr\b|\bratb\b|\bstb\b|parcare|metrorex|combustibil/i,
  ],
  ['Casă', /dedeman|leroy\s?merlin|hornbach|\bikea\b|mobexpert|brico\s?depot|\bjysk\b/i],
  ['Electronice', /\bemag\b|altex|media\s?galaxy|flanco|cel\.ro|electronice/i],
];

export function categorizeMerchant(merchant: string | null): Category {
  if (!merchant) return 'Altele';

  for (const [category, pattern] of RULES) {
    if (pattern.test(merchant)) return category;
  }

  return 'Altele';
}
