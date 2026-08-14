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
  // Ridesharing before public transport, and both kept apart: a metro pass and
  // a month of Uber are different habits, and lumping them made the only
  // actionable half of the number invisible.
  {
    category: 'Transport',
    subcategory: 'Taxi & Ridesharing',
    pattern: /\buber\b|\bbolt\b|clever\s?taxi|\btaxi\b/i,
  },
  {
    category: 'Transport',
    subcategory: 'Transport public',
    pattern: /\bratb\b|\bstb\b|metrorex|\bcfr\b|\bmetrou\b/i,
  },
  {
    category: 'Transport',
    subcategory: 'Parcare & Drum',
    pattern: /parcare|rovinie[tț][aă]|autostrad[aă]/i,
  },
  {
    category: 'Transport',
    subcategory: 'Întreținere auto',
    pattern: /vulcanizare|anvelope|service\s?auto|\bitp\b/i,
  },

  // Locuință & Facturi — telecom is split out from the meters. One rule used to
  // send Enel and Vodafone to the same place, which is how a prepaid top-up
  // ended up filed as a household utility.
  {
    category: 'Locuință & Facturi',
    subcategory: 'Telefon & Internet',
    pattern: /vodafone|orange|telekom|\bdigi\b|rcs\s?(&|și)?\s?rds|cartel[aă]|re[iî]nc[aă]rcare/i,
  },
  {
    category: 'Locuință & Facturi',
    subcategory: 'Utilități',
    pattern: /\benel\b|engie|\be\.?on\b|hidroelectrica|apa\s?nova|distrigaz|\bgaz\b/i,
  },
  {
    category: 'Locuință & Facturi',
    subcategory: 'Întreținere & Reparații',
    pattern: /dedeman|leroy\s?merlin|hornbach|brico\s?depot|[iî]ntre[tț]inere\s?bloc/i,
  },

  // Sănătate & Îngrijire
  {
    category: 'Sănătate & Îngrijire',
    subcategory: 'Farmacie',
    pattern: /sensiblu|catena|\bdona\b|help\s?net|farmacie/i,
  },
  {
    category: 'Sănătate & Îngrijire',
    subcategory: 'Medical',
    pattern: /regina\s?maria|medlife|sanador|policlinic[aă]|stomatolog/i,
  },
  {
    category: 'Sănătate & Îngrijire',
    subcategory: 'Sport & Fitness',
    pattern: /world\s?class|7\s?card|smartfit|s[aă]l[aă]\s?fitness/i,
  },
  {
    category: 'Sănătate & Îngrijire',
    subcategory: 'Îngrijire personală',
    pattern: /frizerie|coafor|barber|salon|\bnotino\b|douglas/i,
  },

  // Cumpărături
  {
    category: 'Cumpărături',
    subcategory: 'Electronice',
    pattern: /\bemag\b|altex|media\s?galaxy|flanco|cel\.ro/i,
  },
  {
    category: 'Cumpărături',
    subcategory: 'Îmbrăcăminte & Încălțăminte',
    pattern: /\bh&m\b|\bzara\b|\bc&a\b|lc\s?waikiki|fashion\s?days|\bccc\b|deichmann/i,
  },
  {
    category: 'Cumpărături',
    subcategory: 'Casă & Decor',
    // Dedeman is deliberately absent: it is matched above as Întreținere &
    // Reparații, since a DIY store is far more often a repair run than a
    // furniture purchase, and a second pattern here would never be reached.
    pattern: /\bikea\b|mobexpert|\bjysk\b/i,
  },

  // Familie & Educație
  {
    category: 'Familie & Educație',
    subcategory: 'Animale de companie',
    pattern: /maxi\s?zoo|pet\s?shop|veterinar/i,
  },
  {
    category: 'Familie & Educație',
    subcategory: 'Educație & Cursuri',
    pattern: /udemy|coursera|\bcurs\b|libr[aă]rie|c[aă]rt[uă]re[sș]ti/i,
  },

  // Divertisment — named for what is bought, not for the fact that it recurs.
  {
    category: 'Divertisment',
    subcategory: 'Streaming & Media',
    pattern: /netflix|spotify|hbo\s?max|disney|youtube\s?premium/i,
  },
  {
    category: 'Divertisment',
    subcategory: 'Filme & Jocuri',
    pattern: /cinema\s?city|playstation|\bsteam\b|\bxbox\b/i,
  },
  {
    category: 'Divertisment',
    subcategory: 'Călătorii & Cazare',
    pattern: /booking|airbnb|wizz\s?air|\btarom\b|blue\s?air/i,
  },
  {
    category: 'Divertisment',
    subcategory: 'Ieșiri & Evenimente',
    pattern: /iabilet|eventim|bilete\.ro|festival/i,
  },

  // Financiar
  {
    category: 'Financiar',
    subcategory: 'Comisioane bancare',
    pattern: /\bbcr\b|\bbrd\b|\bing\s?bank\b|banca\s?transilvania|comision/i,
  },
  {
    category: 'Financiar',
    subcategory: 'Asigurări',
    pattern: /allianz|groupama|asirom|\brca\b|\bcasco\b|asigurare/i,
  },
  {
    category: 'Financiar',
    subcategory: 'Taxe & Impozite',
    pattern: /\banaf\b|impozit|ghi[sș]eul\.ro/i,
  },
];

export interface CategorizeResult {
  category: Category;
  subcategory: string | null;
}

/**
 * The rules, reporting a miss as `null` rather than as a default.
 *
 * The manual form needs that distinction: "Altele" arrived at by recognising
 * nothing is a placeholder it must not advertise, while "Altele" is also a
 * legitimate answer a rule could give. Only a real match is worth showing the
 * user as a suggestion.
 */
export function suggestCategory(merchant: string | null): CategorizeResult | null {
  if (!merchant) return null;

  for (const { category, subcategory, pattern } of RULES) {
    if (pattern.test(merchant)) return { category, subcategory };
  }

  return null;
}

export function categorizeMerchant(merchant: string | null): CategorizeResult {
  return suggestCategory(merchant) ?? { category: 'Altele', subcategory: null };
}
