import type { Category } from '@/lib/categories';

interface Rule {
  category: Category;
  subcategory: string;
  pattern: RegExp;
}

// Ordered rules, first match wins. Keep more specific patterns above more
// generic ones (e.g. a supermarket chain before a bare "market").
const RULES: Rule[] = [
  // Mâncare & Băutură
  {
    category: 'Mâncare & Băutură',
    subcategory: 'Livrare mâncare',
    pattern: /glovo|tazz|bolt\s?food/i,
  },
  {
    category: 'Mâncare & Băutură',
    subcategory: 'Cafea & Gustări',
    pattern: /starbucks|5\s?to\s?go|cafenea|\bcoffee\b/i,
  },
  {
    category: 'Mâncare & Băutură',
    subcategory: 'Restaurante',
    pattern: /restaurant|pizza|\bkfc\b|mcdonald|shaorma/i,
  },
  {
    category: 'Mâncare & Băutură',
    subcategory: 'Alimente',
    pattern: /kaufland|lidl|mega\s?image|carrefour|profi|auchan|penny|\bmetro\b|\bcora\b/i,
  },

  // Transport
  {
    category: 'Transport',
    subcategory: 'Combustibil',
    pattern: /\bomv\b|petrom|rompetrol|\bmol\b|lukoil|socar|combustibil/i,
  },
  {
    category: 'Transport',
    subcategory: 'Transport public',
    pattern: /\bratb\b|\bstb\b|metrorex|\bcfr\b|\buber\b|\bbolt\b|\btaxi\b/i,
  },
  {
    category: 'Transport',
    subcategory: 'Parcare & Taxe drum',
    pattern: /parcare|rovinie[tț][aă]|autostrad[aă]/i,
  },
  {
    category: 'Transport',
    subcategory: 'Întreținere auto',
    pattern: /vulcanizare|anvelope|service\s?auto/i,
  },

  // Casă
  {
    category: 'Casă',
    subcategory: 'Utilități',
    pattern: /\benel\b|engie|\be\.?on\b|\bdigi\b|rcs\s?(&|și)?\s?rds|vodafone|orange|telekom/i,
  },
  {
    category: 'Casă',
    subcategory: 'Mobilă & Electrocasnice',
    pattern: /\bikea\b|mobexpert|\bjysk\b/i,
  },
  {
    category: 'Casă',
    subcategory: 'Renovări',
    pattern: /dedeman|leroy\s?merlin|hornbach|brico\s?depot/i,
  },

  // Sănătate
  {
    category: 'Sănătate',
    subcategory: 'Farmacie',
    pattern: /sensiblu|catena|\bdona\b|help\s?net|farmacie/i,
  },
  {
    category: 'Sănătate',
    subcategory: 'Medical',
    pattern: /regina\s?maria|medlife|sanador/i,
  },
  {
    category: 'Sănătate',
    subcategory: 'Fitness',
    pattern: /world\s?class|7\s?card/i,
  },

  // Cumpărături
  {
    category: 'Cumpărături',
    subcategory: 'Electronice',
    pattern: /\bemag\b|altex|media\s?galaxy|flanco|cel\.ro/i,
  },
  {
    category: 'Cumpărături',
    subcategory: 'Îmbrăcăminte',
    pattern: /\bh&m\b|\bzara\b|\bc&a\b|lc\s?waikiki/i,
  },
  {
    category: 'Cumpărături',
    subcategory: 'Cumpărături generale',
    pattern: /fashion\s?days/i,
  },

  // Familie
  {
    category: 'Familie',
    subcategory: 'Animale de companie',
    pattern: /maxi\s?zoo|pet\s?shop/i,
  },

  // Divertisment
  {
    category: 'Divertisment',
    subcategory: 'Abonamente',
    pattern: /netflix|spotify|hbo\s?max|disney/i,
  },
  {
    category: 'Divertisment',
    subcategory: 'Filme & Jocuri',
    pattern: /cinema\s?city|playstation/i,
  },
  {
    category: 'Divertisment',
    subcategory: 'Călătorii & Timp liber',
    pattern: /booking|airbnb|wizz\s?air|\btarom\b/i,
  },

  // Financiar
  {
    category: 'Financiar',
    subcategory: 'Comisioane bancare',
    pattern: /\bbcr\b|\bbrd\b|\bing\s?bank\b|banca\s?transilvania/i,
  },
  {
    category: 'Financiar',
    subcategory: 'Asigurări',
    pattern: /allianz|groupama/i,
  },
];

export interface CategorizeResult {
  category: Category;
  subcategory: string | null;
}

export function categorizeMerchant(merchant: string | null): CategorizeResult {
  if (!merchant) return { category: 'Altele', subcategory: null };

  for (const { category, subcategory, pattern } of RULES) {
    if (pattern.test(merchant)) return { category, subcategory };
  }

  return { category: 'Altele', subcategory: null };
}
