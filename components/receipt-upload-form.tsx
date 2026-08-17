'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Camera, CheckCircle2, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryPicker } from '@/components/category-picker';
// Shared with the batch screen so the two flows cannot end up accepting
// different files.
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '@/lib/receipts/upload';
import {
  CATEGORIES,
  CATEGORY_BADGE_CLASS,
  isCategory,
  isSubcategoryOf,
  type Category,
} from '@/lib/categories';

type Status = 'idle' | 'uploading' | 'processing' | 'reviewing' | 'success' | 'error';

interface OcrResult {
  merchant: string | null;
  amount: number | null;
  purchaseDate: string | null;
  category: string | null;
  subcategory: string | null;
}

export function ReceiptUploadForm({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus('error');
      setError('Format neacceptat. Folosește JPEG, PNG, WEBP sau HEIC.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus('error');
      setError('Imaginea e prea mare (maxim 10MB).');
      return;
    }

    setStatus('uploading');
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setStatus('error');
      setError(uploadError.message);
      return;
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: inserted, error: insertError } = await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        household_id: membership?.household_id ?? null,
        storage_path: path,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      setStatus('error');
      setError(insertError?.message ?? 'Nu am putut salva bonul.');
      return;
    }

    setStatus('processing');

    let data: OcrResult | null = null;
    try {
      const response = await fetch(`/api/receipts/${inserted.id}/process`, { method: 'POST' });
      const json = await response.json();
      if (response.ok) {
        data = json;
      }
    } catch {
      // OCR failed silently — the user can still fill in the fields below by hand.
    }

    setReceiptId(inserted.id);
    setResult(data);
    setStatus('reviewing');
  }

  function reset() {
    setStatus('idle');
    setError(null);
    setPreview(null);
    setResult(null);
    setReceiptId(null);
    setSaving(false);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receiptId) return;

    const formData = new FormData(event.currentTarget);
    const merchant = String(formData.get('merchant') ?? '').trim() || null;
    const amountRaw = String(formData.get('amount') ?? '').trim();
    const purchaseDate = String(formData.get('purchase_date') ?? '').trim() || null;
    const categoryRaw = String(formData.get('category') ?? '');

    const amount = amountRaw ? Number(amountRaw) : null;
    if (amountRaw && (Number.isNaN(amount) || (amount as number) < 0)) {
      setError('Sumă invalidă');
      return;
    }

    const category = (
      (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'Altele'
    ) as Category;
    const subcategoryRaw = String(formData.get('subcategory') ?? '').trim() || null;
    const subcategory = isSubcategoryOf(category, subcategoryRaw) ? subcategoryRaw : null;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        merchant,
        amount,
        purchase_date: purchaseDate,
        category,
        subcategory,
        status: amount !== null ? 'processed' : 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setResult({ merchant, amount, purchaseDate, category, subcategory });
    setStatus('success');
  }

  if (status === 'reviewing') {
    return (
      <form onSubmit={handleReviewSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <p className="text-muted-foreground text-center text-sm">
          Verifică datele extrase din bon și corectează dacă e nevoie.
        </p>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Previzualizare bon"
            className="mx-auto h-40 w-40 rounded-lg object-cover"
          />
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="merchant">Comerciant</Label>
          <Input id="merchant" name="merchant" defaultValue={result?.merchant ?? ''} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Sumă (lei)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            name="amount"
            defaultValue={result?.amount ?? ''}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchase_date">Data cumpărării</Label>
          <Input
            id="purchase_date"
            type="date"
            name="purchase_date"
            defaultValue={result?.purchaseDate ?? ''}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Categorie</Label>
          <CategoryPicker
            defaultCategory={
              isCategory(result?.category ?? null) ? (result!.category as Category) : 'Altele'
            }
            defaultSubcategory={result?.subcategory ?? null}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" size="lg" disabled={saving} className="mt-2 h-12 rounded-full">
          {saving ? 'Se salvează…' : 'Salvează'}
        </Button>
      </form>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-foreground flex items-center gap-2 text-lg font-medium">
          <CheckCircle2 className="h-5 w-5 text-[#0ca30c]" />
          Bon adăugat!
        </div>
        {result && (result.merchant || result.amount !== null) && (
          <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
            {result.merchant && <p>{result.merchant}</p>}
            {result.amount !== null && (
              <p className="text-foreground font-medium">{result.amount.toFixed(2)} lei</p>
            )}
            {result.purchaseDate && <p>{result.purchaseDate}</p>}
            {isCategory(result.category) && (
              <Badge className={`border-transparent ${CATEGORY_BADGE_CLASS[result.category]}`}>
                {result.subcategory ?? result.category}
              </Badge>
            )}
          </div>
        )}
        <Button variant="outline" size="lg" className="rounded-full" onClick={reset}>
          Adaugă alt bon
        </Button>
      </div>
    );
  }

  const busy = status === 'uploading' || status === 'processing';

  return (
    <div className="flex flex-col items-center gap-4">
      {preview && busy && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Previzualizare bon" className="h-48 w-48 rounded-lg object-cover" />
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <Button
        size="lg"
        disabled={busy}
        onClick={() => cameraInputRef.current?.click()}
        className="h-12 w-64 rounded-full"
      >
        <Camera />
        {status === 'uploading' && 'Se încarcă…'}
        {status === 'processing' && 'Se procesează…'}
        {!busy && 'Fă o poză'}
      </Button>
      <Button
        variant="outline"
        size="lg"
        disabled={busy}
        onClick={() => galleryInputRef.current?.click()}
        className="h-12 w-64 rounded-full"
      >
        <ImagePlus />
        Alege din galerie
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
