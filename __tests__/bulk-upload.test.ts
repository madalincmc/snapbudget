import { describe, expect, it } from 'vitest';
import {
  MAX_BATCH,
  MAX_FILE_SIZE,
  addFiles,
  bulkProgress,
  describeAddition,
  fileKey,
  fileRejection,
  isProcessable,
  needsReview,
  type BulkItem,
  type BulkStatus,
  type FileLike,
} from '@/lib/receipts/upload';

function file(name: string, overrides: Partial<FileLike> = {}): FileLike {
  return { name, size: 1000, type: 'image/jpeg', lastModified: 1, ...overrides };
}

function item(id: string, status: BulkStatus, overrides: Partial<BulkItem> = {}): BulkItem {
  return {
    id,
    name: id,
    size: 1000,
    status,
    error: null,
    receiptId: null,
    merchant: null,
    amount: status === 'success' ? 10 : null,
    ...overrides,
  };
}

describe('fileRejection', () => {
  it('accepts the formats a phone camera produces', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) {
      expect(fileRejection(file('a.jpg', { type })), type).toBeNull();
    }
  });

  it('rejects a format that is not an image we read', () => {
    expect(fileRejection(file('a.pdf', { type: 'application/pdf' }))).toBe('format neacceptat');
  });

  it('rejects an image over the size limit, and accepts one exactly on it', () => {
    expect(fileRejection(file('a.jpg', { size: MAX_FILE_SIZE + 1 }))).toBe('peste 10MB');
    expect(fileRejection(file('a.jpg', { size: MAX_FILE_SIZE }))).toBeNull();
  });
});

describe('fileKey', () => {
  it('separates two files that differ in any of name, size or time', () => {
    const base = file('a.jpg');
    const keys = new Set([
      fileKey(base),
      fileKey({ ...base, name: 'b.jpg' }),
      fileKey({ ...base, size: 2000 }),
      fileKey({ ...base, lastModified: 2 }),
    ]);
    expect(keys.size).toBe(4);
  });

  it('gives the same file the same key twice', () => {
    expect(fileKey(file('a.jpg'))).toBe(fileKey(file('a.jpg')));
  });
});

describe('addFiles', () => {
  it('takes a clean selection whole', () => {
    const result = addFiles([], [file('a.jpg'), file('b.jpg')]);

    expect(result.items).toHaveLength(2);
    expect(result.added).toBe(2);
    expect(result.duplicates).toBe(0);
    expect(result.rejected).toEqual([]);
    expect(result.items.every((i) => i.status === 'pending')).toBe(true);
  });

  it('drops a photo already in the batch', () => {
    const first = addFiles([], [file('a.jpg')]);
    const second = addFiles(first.items, [file('a.jpg'), file('b.jpg')]);

    expect(second.items).toHaveLength(2);
    expect(second.added).toBe(1);
    expect(second.duplicates).toBe(1);
  });

  it('drops a photo repeated inside one selection', () => {
    const result = addFiles([], [file('a.jpg'), file('a.jpg')]);

    expect(result.items).toHaveLength(1);
    expect(result.duplicates).toBe(1);
  });

  it('keeps two different photos that happen to share a name', () => {
    const result = addFiles([], [file('IMG_0001.jpg'), file('IMG_0001.jpg', { size: 2000 })]);
    expect(result.items).toHaveLength(2);
  });

  it('reports what it rejected rather than dropping it silently', () => {
    const result = addFiles(
      [],
      [
        file('a.jpg'),
        file('doc.pdf', { type: 'application/pdf' }),
        file('huge.jpg', { size: MAX_FILE_SIZE + 1 }),
      ],
    );

    expect(result.items).toHaveLength(1);
    expect(result.rejected).toEqual([
      { name: 'doc.pdf', reason: 'format neacceptat' },
      { name: 'huge.jpg', reason: 'peste 10MB' },
    ]);
  });

  it('stops at the batch limit and says how many it left', () => {
    const many = Array.from({ length: MAX_BATCH + 3 }, (_, i) => file(`${i}.jpg`));
    const result = addFiles([], many);

    expect(result.items).toHaveLength(MAX_BATCH);
    expect(result.added).toBe(MAX_BATCH);
    expect(result.overflow).toBe(3);
  });

  it('leaves the batch it was given untouched', () => {
    const existing = addFiles([], [file('a.jpg')]).items;
    const before = [...existing];
    addFiles(existing, [file('b.jpg')]);
    expect(existing).toEqual(before);
  });

  it('does not disturb rows that are already through', () => {
    const done = [item('done', 'success', { receiptId: 'r1' })];
    const result = addFiles(done, [file('a.jpg')]);

    expect(result.items[0]).toEqual(done[0]);
    expect(result.items).toHaveLength(2);
  });
});

describe('isProcessable', () => {
  it('picks up what has not run and what failed', () => {
    expect(isProcessable(item('a', 'pending'))).toBe(true);
    expect(isProcessable(item('a', 'failed'))).toBe(true);
  });

  it('leaves alone what is in flight or already through', () => {
    // The guard against putting one receipt through twice in a session.
    for (const status of ['uploading', 'processing', 'success'] as BulkStatus[]) {
      expect(isProcessable(item('a', status)), status).toBe(false);
    }
  });
});

describe('needsReview', () => {
  it('flags a receipt that was saved without an amount', () => {
    expect(needsReview(item('a', 'success', { amount: null }))).toBe(true);
    expect(needsReview(item('a', 'success', { amount: 12.5 }))).toBe(false);
  });

  it('is not about failures — those are retried, not reviewed', () => {
    expect(needsReview(item('a', 'failed', { amount: null }))).toBe(false);
  });
});

describe('bulkProgress', () => {
  it('is empty and idle with nothing selected', () => {
    expect(bulkProgress([])).toMatchObject({
      total: 0,
      done: 0,
      percent: 0,
      isRunning: false,
      isComplete: false,
    });
  });

  it('counts a batch part way through', () => {
    const progress = bulkProgress([
      item('a', 'success'),
      item('b', 'success'),
      item('c', 'failed'),
      item('d', 'processing'),
      item('e', 'pending'),
    ]);

    expect(progress).toMatchObject({
      total: 5,
      success: 2,
      failed: 1,
      done: 3,
      active: 1,
      pending: 1,
      percent: 60,
      isRunning: true,
      isComplete: false,
    });
  });

  it('counts an upload as active, the same as a read', () => {
    expect(bulkProgress([item('a', 'uploading')])).toMatchObject({ active: 1, isRunning: true });
  });

  it('is complete when nothing is left to run, failures included', () => {
    const progress = bulkProgress([item('a', 'success'), item('b', 'failed')]);

    expect(progress.isComplete).toBe(true);
    expect(progress.isRunning).toBe(false);
    expect(progress.percent).toBe(100);
  });

  it('is not complete while one is still queued', () => {
    expect(bulkProgress([item('a', 'success'), item('b', 'pending')]).isComplete).toBe(false);
  });
});

describe('describeAddition', () => {
  it('says nothing when the whole selection was taken', () => {
    expect(describeAddition(addFiles([], [file('a.jpg')]))).toBeNull();
  });

  it('accounts for a single skipped file in the singular', () => {
    const first = addFiles([], [file('a.jpg')]);
    expect(describeAddition(addFiles(first.items, [file('a.jpg')]))).toBe(
      'Un fișier a fost ignorat: unul era deja în listă.',
    );
  });

  it('groups several reasons into one line', () => {
    const first = addFiles([], [file('a.jpg')]);
    const message = describeAddition(
      addFiles(first.items, [
        file('a.jpg'),
        file('b.pdf', { type: 'application/pdf' }),
        file('c.pdf', { type: 'application/pdf' }),
      ]),
    );

    expect(message).toBe(
      '3 fișiere au fost ignorate: unul era deja în listă, 2 au format neacceptat.',
    );
  });

  it('mentions the batch limit when it was what stopped them', () => {
    const many = Array.from({ length: MAX_BATCH + 1 }, (_, i) => file(`${i}.jpg`));
    expect(describeAddition(addFiles([], many))).toContain(`peste limita de ${MAX_BATCH}`);
  });
});
