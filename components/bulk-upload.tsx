'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Images,
  LoaderCircle,
  RotateCw,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  ALLOWED_TYPES,
  CONCURRENCY,
  MAX_BATCH,
  addFiles,
  bulkProgress,
  describeAddition,
  fileKey,
  isProcessable,
  needsReview,
  type BulkItem,
} from '@/lib/receipts/upload';

export function BulkUpload({
  userId,
  householdId,
}: {
  userId: string;
  /** Resolved once on the server rather than per receipt, as the single form does. */
  householdId: string | null;
}) {
  const [items, setItems] = useState<BulkItem[]>([]);
  /** Object URLs by item id. State rather than a ref because a row renders one,
   *  and a ref read during render is not something React promises to honour. */
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** The images themselves, only ever read from an async worker. */
  const files = useRef(new Map<string, File>());
  /** Mirrors the preview URLs, purely so unmount has something to revoke. */
  const urls = useRef(new Set<string>());
  /** Set by the worker that uploaded the image, and read by a later retry. */
  const receiptIds = useRef(new Map<string, string>());
  /** One run at a time, whatever the button does. */
  const running = useRef(false);

  const progress = bulkProgress(items);

  useEffect(() => {
    const held = urls.current;
    return () => {
      for (const url of held) URL.revokeObjectURL(url);
    };
  }, []);

  // Closing the tab mid-run would leave rows uploaded but never read.
  useEffect(() => {
    if (!progress.isRunning) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [progress.isRunning]);

  function update(id: string, patch: Partial<BulkItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleSelection(selection: FileList | null) {
    if (!selection?.length) return;

    const picked = Array.from(selection);
    const result = addFiles(items, picked);

    // Matched on the same key the row was given, not on the name: two photos
    // can perfectly well be called IMG_0001.jpg.
    const byKey = new Map(picked.map((file) => [fileKey(file), file]));
    const fresh: Record<string, string> = {};
    for (const item of result.items) {
      if (files.current.has(item.id)) continue;
      const file = byKey.get(item.id);
      if (!file) continue;

      files.current.set(item.id, file);
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      fresh[item.id] = url;
    }

    setPreviews((prev) => ({ ...prev, ...fresh }));
    setItems(result.items);
    setNotice(describeAddition(result));
    // Same photo picked twice in a row fires no change event otherwise.
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(id: string) {
    setPreviews((prev) => {
      const url = prev[id];
      if (url) {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
    files.current.delete(id);
    receiptIds.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const processOne = useCallback(
    async (item: BulkItem) => {
      const file = files.current.get(item.id);
      if (!file) return;

      update(item.id, { status: 'uploading', error: null });
      const supabase = createClient();

      try {
        let receiptId = receiptIds.current.get(item.id);

        // Skipped on a retry: the image is already in storage and the row
        // already exists, so re-uploading would leave a duplicate behind.
        if (!receiptId) {
          const extension = file.name.split('.').pop() || 'jpg';
          const path = `${userId}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(path, file, { contentType: file.type });
          if (uploadError) throw new Error(uploadError.message);

          const { data: inserted, error: insertError } = await supabase
            .from('receipts')
            .insert({
              user_id: userId,
              household_id: householdId,
              storage_path: path,
              status: 'pending',
            })
            .select('id')
            .single();
          if (insertError || !inserted) {
            throw new Error(insertError?.message ?? 'Nu am putut salva bonul.');
          }

          receiptId = inserted.id as string;
          receiptIds.current.set(item.id, receiptId);
          update(item.id, { receiptId });
        }

        update(item.id, { status: 'processing' });

        const response = await fetch(`/api/receipts/${receiptId}/process`, { method: 'POST' });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error ?? 'Citirea bonului a eșuat.');

        update(item.id, {
          status: 'success',
          merchant: json.merchant ?? null,
          amount: json.amount ?? null,
          error: null,
        });
      } catch (err) {
        update(item.id, { status: 'failed', error: (err as Error).message });
      }
    },
    [householdId, userId],
  );

  /**
   * Runs the given items through a small pool.
   *
   * The queue is built once, from the items eligible at the moment the run
   * starts, so pressing the button twice cannot put the same receipt through
   * twice — and a retry of one row cannot start while a run is going.
   */
  const run = useCallback(
    async (queue: BulkItem[]) => {
      if (running.current || queue.length === 0) return;
      running.current = true;

      const remaining = [...queue];
      const worker = async () => {
        for (;;) {
          const next = remaining.shift();
          if (!next) return;
          await processOne(next);
        }
      };

      try {
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, remaining.length) }, worker));
      } finally {
        running.current = false;
      }
    },
    [processOne],
  );

  const queued = items.filter(isProcessable);
  const canStart = queued.length > 0 && !progress.isRunning;

  return (
    <div className="flex w-full flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(event) => handleSelection(event.target.files)}
      />

      {items.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
          <Images className="text-muted-foreground/60 size-8" />
          <p className="text-muted-foreground text-sm">
            Alege până la {MAX_BATCH} poze cu bonuri. Le citim pe rând, fiecare separat.
          </p>
          <Button size="lg" className="rounded-full" onClick={() => inputRef.current?.click()}>
            <Images />
            Alege pozele
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-foreground text-sm font-medium">
                {progress.done} din {progress.total} procesate
              </span>
              {progress.failed > 0 && (
                <span className="text-danger-ink text-xs">{progress.failed} eșuate</span>
              )}
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <ul className="divide-border flex flex-col divide-y">
            {items.map((item) => (
              <BulkRow
                key={item.id}
                item={item}
                previewUrl={previews[item.id] ?? null}
                busy={progress.isRunning}
                onRemove={() => remove(item.id)}
                onRetry={() => run([item])}
              />
            ))}
          </ul>
        </>
      )}

      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="h-12 rounded-full"
            disabled={!canStart}
            onClick={() => run(queued)}
          >
            {progress.isRunning ? (
              <>
                <LoaderCircle className="animate-spin" />
                Se procesează…
              </>
            ) : progress.isComplete ? (
              'Toate au fost procesate'
            ) : (
              `Procesează ${queued.length} ${queued.length === 1 ? 'bon' : 'bonuri'}`
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-full"
            disabled={progress.isRunning || items.length >= MAX_BATCH}
            onClick={() => inputRef.current?.click()}
          >
            <Images />
            Mai adaugă poze
          </Button>
        </div>
      )}

      <ExitLink running={progress.isRunning} />
    </div>
  );
}

function BulkRow({
  item,
  previewUrl,
  busy,
  onRemove,
  onRetry,
}: {
  item: BulkItem;
  previewUrl: string | null;
  busy: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const review = needsReview(item);

  return (
    <li className="flex items-center gap-3 py-3">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="size-11 flex-none rounded-xl object-cover"
          aria-hidden
        />
      ) : (
        <div className="bg-muted size-11 flex-none rounded-xl" aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground truncate text-sm font-medium">
          {item.status === 'success' ? (item.merchant ?? 'Bon fără nume') : item.name}
        </span>
        <span
          className={cn(
            'truncate text-xs',
            item.status === 'failed' ? 'text-danger-ink' : 'text-muted-foreground',
          )}
        >
          {item.status === 'pending' && 'În așteptare'}
          {item.status === 'uploading' && 'Se încarcă…'}
          {item.status === 'processing' && 'Se citește…'}
          {item.status === 'success' &&
            (review ? 'Adăugat — completează suma' : `${item.amount?.toFixed(2)} lei`)}
          {item.status === 'failed' && (item.error ?? 'A eșuat')}
        </span>
      </div>

      <div className="flex flex-none items-center gap-1">
        {(item.status === 'uploading' || item.status === 'processing') && (
          <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
        )}

        {item.status === 'success' &&
          (review ? (
            <Button
              variant="ghost"
              size="xs"
              nativeButton={false}
              render={<Link href={`/receipts/${item.receiptId}?from=/receipts/bulk`} />}
            >
              <CircleAlert className="text-warn-ink" />
              Deschide
            </Button>
          ) : (
            <CheckCircle2 className="text-ok size-4" />
          ))}

        {item.status === 'failed' && (
          <Button variant="ghost" size="icon-sm" disabled={busy} onClick={onRetry}>
            <RotateCw />
            <span className="sr-only">Încearcă din nou</span>
          </Button>
        )}

        {/* Removing a row that already became a receipt would only take it off
            this screen, so the control goes once the upload has happened. */}
        {isProcessable(item) && item.receiptId === null && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground/50 hover:text-destructive"
            disabled={busy}
            onClick={onRemove}
          >
            <X />
            <span className="sr-only">Scoate din listă</span>
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * The way back. While a run is going it asks first — leaving mid-batch would
 * strand receipts uploaded but never read, and there is nothing on the other
 * side of this screen that resumes them.
 */
function ExitLink({ running }: { running: boolean }) {
  if (!running) {
    return (
      <Button
        variant="link"
        className="text-muted-foreground"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        <ArrowLeft />
        Înapoi la dashboard
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="link" className="text-muted-foreground">
            <ArrowLeft />
            Înapoi la dashboard
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Procesarea e în curs</AlertDialogTitle>
          <AlertDialogDescription>
            Dacă pleci acum, bonurile rămase necitite nu se mai procesează. Le găsești în istoric și
            le poți completa manual.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Rămân aici</AlertDialogCancel>
          <AlertDialogAction
            nativeButton={false}
            render={<Link href="/dashboard" />}
            className="no-underline"
          >
            Ieși oricum
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
