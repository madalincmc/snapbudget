import type { SupabaseClient } from '@supabase/supabase-js';
import { detectText } from '@/lib/ocr/vision';
import { parseReceiptText } from '@/lib/ocr/parse-receipt';
import { categorizeMerchant } from '@/lib/categorization/categorize';

export interface ScannedReceipt {
  merchant: string | null;
  amount: number | null;
  purchaseDate: string | null;
  category: string;
  subcategory: string | null;
}

/** Thrown when the image is not where it was said to be. */
export const DOWNLOAD_FAILED = 'download_failed';

/**
 * Reads a receipt image out of storage and returns what it could make of it.
 *
 * Deliberately writes nothing. The two callers want the same reading but not
 * the same commitment: the batch screen saves what it finds, because it has no
 * review step to hold it against, while the single-receipt screen shows it to
 * the reader and stores nothing until they accept it.
 *
 * The client is the caller's own, so storage RLS applies — an image outside
 * the reader's own folder does not download.
 */
export async function scanReceipt(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<ScannedReceipt> {
  const { data: file, error } = await supabase.storage.from('receipts').download(storagePath);
  if (error || !file) throw new Error(DOWNLOAD_FAILED);

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await detectText(buffer.toString('base64'));
  const parsed = parseReceiptText(text);
  const { category, subcategory } = categorizeMerchant(parsed.merchant);

  return { ...parsed, category, subcategory };
}
