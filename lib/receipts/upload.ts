/**
 * What both upload flows agree on about a receipt image, plus the queue the
 * bulk screen runs on.
 *
 * The rules live here rather than in either component so the single-receipt
 * form and the batch cannot drift into accepting different files.
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/**
 * A cap on one batch. Past this the list stops being something you can scan,
 * and the browser is holding that many object URLs and decoded previews at
 * once on a phone.
 */
export const MAX_BATCH = 20;

/**
 * How many receipts are in flight at once. Each one is a Vision call behind a
 * function invocation, so this is deliberately modest — the point is that a
 * slow receipt does not hold up the other seven, not to fan out as wide as the
 * browser will allow.
 */
export const CONCURRENCY = 3;

export type BulkStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'failed';

export interface BulkItem {
  /** Also the dedupe key — see `fileKey`. */
  id: string;
  name: string;
  size: number;
  status: BulkStatus;
  error: string | null;
  /**
   * The row this item became, once it exists. Kept so a retry re-runs OCR over
   * the receipt already uploaded rather than uploading a second copy of the
   * same image and leaving a stray row behind.
   */
  receiptId: string | null;
  merchant: string | null;
  amount: number | null;
}

/** Just the parts of File this module reads, so it can be tested without one. */
export interface FileLike {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface RejectedFile {
  name: string;
  reason: string;
}

export interface AddResult {
  items: BulkItem[];
  added: number;
  duplicates: number;
  /** Dropped for want of room in the batch. */
  overflow: number;
  rejected: RejectedFile[];
}

/** Why this file cannot be uploaded, or null when it can. */
export function fileRejection(file: FileLike): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'format neacceptat';
  if (file.size > MAX_FILE_SIZE) return 'peste 10MB';
  return null;
}

/**
 * Identifies a file well enough to notice the same one picked twice.
 *
 * Name, size and modification time together: the file picker hands out no id
 * of its own, and hashing the bytes would mean reading every image just to
 * list it.
 */
export function fileKey(file: FileLike): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Folds a fresh selection into the batch, dropping what cannot be uploaded and
 * what is already there.
 *
 * Picking the same photo twice is the easy mistake here — the gallery reopens
 * on whatever was tapped last — and the batch is the only place to catch it,
 * since by the time two copies are uploaded they are two separate receipts.
 */
export function addFiles(existing: BulkItem[], incoming: FileLike[]): AddResult {
  const items = [...existing];
  const seen = new Set(existing.map((item) => item.id));
  const rejected: RejectedFile[] = [];
  let added = 0;
  let duplicates = 0;
  let overflow = 0;

  for (const file of incoming) {
    const reason = fileRejection(file);
    if (reason) {
      rejected.push({ name: file.name, reason });
      continue;
    }

    const id = fileKey(file);
    if (seen.has(id)) {
      duplicates += 1;
      continue;
    }

    if (items.length >= MAX_BATCH) {
      overflow += 1;
      continue;
    }

    seen.add(id);
    items.push({
      id,
      name: file.name,
      size: file.size,
      status: 'pending',
      error: null,
      receiptId: null,
      merchant: null,
      amount: null,
    });
    added += 1;
  }

  return { items, added, duplicates, overflow, rejected };
}

/**
 * Whether this item is one the queue may pick up.
 *
 * The guard against processing the same receipt twice in a session: anything
 * already in flight, or already through, is not eligible however many times
 * the button is pressed.
 */
export function isProcessable(item: BulkItem): boolean {
  return item.status === 'pending' || item.status === 'failed';
}

/** Went through, but with no amount on it — saved, and still needing a hand. */
export function needsReview(item: BulkItem): boolean {
  return item.status === 'success' && item.amount === null;
}

export interface BulkProgress {
  total: number;
  /** Through the queue, either way. */
  done: number;
  success: number;
  failed: number;
  /** Uploading or being read. */
  active: number;
  pending: number;
  percent: number;
  isRunning: boolean;
  isComplete: boolean;
}

export function bulkProgress(items: BulkItem[]): BulkProgress {
  const count = (status: BulkStatus) => items.filter((item) => item.status === status).length;

  const success = count('success');
  const failed = count('failed');
  const pending = count('pending');
  const active = count('uploading') + count('processing');
  const done = success + failed;
  const total = items.length;

  return {
    total,
    done,
    success,
    failed,
    active,
    pending,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    isRunning: active > 0,
    // A batch where every failure has been retried into success still counts as
    // complete; what matters is that nothing is left to run.
    isComplete: total > 0 && done === total,
  };
}

/**
 * What to say about a selection that was not taken whole, or null when it was.
 *
 * Silently dropping files would leave the reader counting thumbnails to work
 * out that two of the ten they picked are missing.
 */
export function describeAddition(result: AddResult): string | null {
  const parts: string[] = [];

  if (result.duplicates > 0) {
    parts.push(
      result.duplicates === 1
        ? 'unul era deja în listă'
        : `${result.duplicates} erau deja în listă`,
    );
  }

  for (const { reason } of dedupeReasons(result.rejected)) {
    const n = result.rejected.filter((file) => file.reason === reason).length;
    parts.push(n === 1 ? `unul are ${reason}` : `${n} au ${reason}`);
  }

  if (result.overflow > 0) {
    parts.push(`${result.overflow} peste limita de ${MAX_BATCH}`);
  }

  if (parts.length === 0) return null;

  const skipped = result.duplicates + result.rejected.length + result.overflow;
  const head = skipped === 1 ? 'Un fișier a fost ignorat' : `${skipped} fișiere au fost ignorate`;
  return `${head}: ${parts.join(', ')}.`;
}

function dedupeReasons(rejected: RejectedFile[]): { reason: string }[] {
  return [...new Set(rejected.map((file) => file.reason))].map((reason) => ({ reason }));
}
