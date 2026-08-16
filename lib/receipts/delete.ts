import type { SupabaseClient } from '@supabase/supabase-js';

export type DeleteReceiptResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  /** Visible to the caller but not theirs to delete — someone else's household. */
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'error'; message: string };

/**
 * Shared by the detail screen's server action and the DELETE route the history
 * list calls, so the two cannot drift on who is allowed to delete what.
 */
export async function deleteReceipt(
  supabase: SupabaseClient,
  id: string,
): Promise<DeleteReceiptResult> {
  const { data: receipt } = await supabase
    .from('receipts')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (!receipt) {
    return { ok: false, reason: 'not_found' };
  }

  // `.select()` so the delete comes back as rows rather than just an error
  // slot. A DELETE that row-level security filters down to nothing is not an
  // error in Postgres — it is a successful statement that removed no rows — so
  // without asking for the deleted rows there is no way to tell "gone" from
  // "not yours to delete", and the caller is told it worked either way.
  const { data: deleted, error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    return { ok: false, reason: 'error', message: error.message };
  }

  if (!deleted?.length) {
    return { ok: false, reason: 'forbidden' };
  }

  // Only once the row is actually gone. Removing the file first meant a
  // rejected delete still destroyed the photo of a receipt that stayed put.
  if (receipt.storage_path) {
    await supabase.storage.from('receipts').remove([receipt.storage_path]);
  }

  return { ok: true };
}
