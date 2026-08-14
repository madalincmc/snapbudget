import { describe, expect, it } from 'vitest';
import { parseReceiptText } from '@/lib/ocr/parse-receipt';
import { matchKnownMerchant } from '@/lib/ocr/merchants';

/**
 * The fixtures below are redacted copies of receipts the app actually failed
 * on — names, fiscal codes and terminal ids replaced, every structural quirk
 * kept. The quirks are the whole point: OCR flattens a receipt's two columns
 * into a run of labels followed by a run of figures, and the header is full
 * of ids that outrank the shop name by position alone.
 */

/** Fuel: the first line is a card terminal id, the brand is four lines down. */
const FUEL_RECEIPT = `
ITD WID: SKBXXXXX
KOMBELKOT DM2 KCT4S CS
ROMPETROL
Bank
PUNCT DE LUCRU EXEMPLU
SATU MARE
CIF: RO12345678
CIF CLIENT: RO98765432
43.1899 L X 9.11= 393.46 A
EFIX S BENZINA 98 - POMPA 1
SUBTOTAL
TOTAL LET
CARD
REST
393.46
393.46
393.46
TOTAL TVA A - 21%
NUMAR POZITII: 1
CASIER: EXEMPLU NUME
BON FISCAL
`;

/** A point-of-sale screen, not a fiscal slip: the business is nowhere in it. */
const RESTAURANT_BILL = `
Masa: 55
Logout
Nota: 402289
Ospatar: Exemplu Nume
1 PROSCIUTTO E FUNGHI 38cm
53,00
1 CHEESY PULLED BURGER CU CART
50,00
2 PRIGAT BANANE SI CAPSUNI
26,00
2 PEPSI COLA
24,00
Subtotal:
De plata:
153,00
153,00
din care TVA:
18,88
`;

/** The logo brand sits above the legal entity that operates the shop. */
const SUPERMARKET_RECEIPT = `
☑ profi
zilnic preţuri mici
MEGA IMAGE SRL
BAIA MARE, STR. EXEMPLU. NR.4
JUD. MARAMURES
COD IDENTIFICARE FISCALA: RO6719278
1.000 BUC X 6.99
PEPSI ZMEURA 0.5L
6.99 A
1.000 Buc x 1.85
STICKS SARE
1.85 B
SUBTOTAL
27.93
TOTAL
27.93
TOTAL TVA
4.35
CARD
27.93
`;

/** No known brand — the company suffix has to carry it. */
const INDEPENDENT_SHOP = `
BON FISCAL
CAFENEAUA VECHE SRL
STR. LUNGA NR. 12
CIF: RO98765432
1 CAFEA LATTE
12,00
TOTAL 12,00
`;

describe('merchant', () => {
  it('prefers a known chain over whatever landed on the first line', () => {
    // Was "ITD WID: SKBEISH2" — the card terminal, stored as the business.
    expect(parseReceiptText(FUEL_RECEIPT).merchant).toBe('Rompetrol');
  });

  it('takes the brand above the operating company, not the legal entity', () => {
    // Profi stores are run by Mega Image SRL; the shop on the sign is Profi.
    expect(parseReceiptText(SUPERMARKET_RECEIPT).merchant).toBe('Profi');
  });

  it('falls back to a line carrying a company suffix', () => {
    expect(parseReceiptText(INDEPENDENT_SHOP).merchant).toBe('CAFENEAUA VECHE SRL');
  });

  it('returns nothing rather than a table number or a till button', () => {
    // Was "Masa: 55". An empty field costs one edit; a confident wrong one has
    // to be spotted before it can be corrected.
    expect(parseReceiptText(RESTAURANT_BILL).merchant).toBeNull();
  });

  it('stops reading at the item list', () => {
    const text = 'BON FISCAL\n1 PIZZA MARGHERITA\n45,00\nTOTAL 45,00';
    expect(parseReceiptText(text).merchant).toBeNull();
  });

  it('rejects addresses, fiscal codes and bare ids', () => {
    for (const line of [
      'STR. LUNGA NR. 12',
      'CIF: RO98765432',
      'COD IDENTIFICARE FISCALA: RO6719278',
      'Nota: 402289',
      'Logout',
      'ID:1433914234',
    ]) {
      expect(parseReceiptText(`${line}\nTOTAL 10,00`).merchant, line).toBeNull();
    }
  });

  it('keeps a plain name that is already right', () => {
    expect(parseReceiptText('ZMENTA.ro\nTOTAL 10,00').merchant).toBe('ZMENTA.ro');
  });
});

describe('matchKnownMerchant', () => {
  it('resolves to the earliest brand in the text', () => {
    expect(matchKnownMerchant('profi\nMEGA IMAGE SRL')).toBe('Profi');
    expect(matchKnownMerchant('MEGA IMAGE SRL\nprofi')).toBe('Mega Image');
  });

  it('does not match a brand inside a longer word', () => {
    expect(matchKnownMerchant('METROU LINIA 2')).toBeNull();
  });

  it('says nothing when it recognises nothing', () => {
    expect(matchKnownMerchant('CAFENEAUA VECHE SRL')).toBeNull();
  });
});

describe('amount', () => {
  it('pairs a label with the figure at the same offset in the next column', () => {
    // "Subtotal:" / "De plata:" then 153,00 / 153,00 — the label carries no
    // figure of its own, which used to defeat the parser entirely.
    expect(parseReceiptText(RESTAURANT_BILL).amount).toBe(153);
  });

  it('reads a total printed directly under its label', () => {
    expect(parseReceiptText(SUPERMARKET_RECEIPT).amount).toBe(27.93);
  });

  it('skips a product line when counting the label column', () => {
    expect(parseReceiptText(FUEL_RECEIPT).amount).toBe(393.46);
  });

  it('takes an inline figure from the label line', () => {
    expect(parseReceiptText(INDEPENDENT_SHOP).amount).toBe(12);
  });

  it('never mistakes SUBTOTAL or TOTAL TVA for the total', () => {
    const text = 'SUBTOTAL\n99,00\nTOTAL\n45,00\nTOTAL TVA\n7,18';
    expect(parseReceiptText(text).amount).toBe(45);
  });

  it('prefers DE PLATA over a bare TOTAL when both are present', () => {
    const text = 'TOTAL\n50,00\nDE PLATA\n45,00';
    expect(parseReceiptText(text).amount).toBe(45);
  });

  it('takes the last figure on a crowded total line', () => {
    expect(parseReceiptText('TOTAL 3 ART 45,20').amount).toBe(45.2);
  });

  it('reads both decimal conventions', () => {
    expect(parseReceiptText('TOTAL 1.234,56').amount).toBe(1234.56);
    expect(parseReceiptText('TOTAL 1,234.56').amount).toBe(1234.56);
  });

  it('falls back to the largest figure when nothing is labelled', () => {
    expect(parseReceiptText('12,00\n45,00\n7,50').amount).toBe(45);
  });

  it('reports nothing when there are no figures at all', () => {
    expect(parseReceiptText('un text oarecare\nfără sume').amount).toBeNull();
  });
});

describe('date', () => {
  const iso = (offsetDays: number) => {
    const d = new Date(Date.now() - offsetDays * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  const dmy = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y}`;
  };

  it('prefers the date on a line that announces one', () => {
    const wanted = iso(3);
    const text = `SERIE 12-34-5678\nDATA: ${dmy(wanted)} ORA: 14:31:03`;
    expect(parseReceiptText(text).purchaseDate).toBe(wanted);
  });

  it('keeps looking after a shape that is not a real date', () => {
    // 30 is not a month. The old parser validated only its first match and
    // returned null rather than trying the next candidate.
    const wanted = iso(1);
    expect(parseReceiptText(`12.30.45\n${dmy(wanted)}`).purchaseDate).toBe(wanted);
  });

  it('reads ISO dates', () => {
    const wanted = iso(5);
    expect(parseReceiptText(`Emis ${wanted}`).purchaseDate).toBe(wanted);
  });

  it('ignores dates too far off to be a purchase', () => {
    expect(parseReceiptText('EXPIRA 01/01/2099').purchaseDate).toBeNull();
    expect(parseReceiptText('DATA: 01-01-1998').purchaseDate).toBeNull();
  });

  it('reports nothing when there is no date', () => {
    expect(parseReceiptText(RESTAURANT_BILL).purchaseDate).toBeNull();
  });
});
