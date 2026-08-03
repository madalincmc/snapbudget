'use client';

import { useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CATEGORY_BADGE_CLASS, isCategory } from '@/lib/categories';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

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

    const { data: inserted, error: insertError } = await supabase
      .from('receipts')
      .insert({ user_id: userId, storage_path: path, status: 'pending' })
      .select('id')
      .single();

    if (insertError || !inserted) {
      setStatus('error');
      setError(insertError?.message ?? 'Nu am putut salva bonul.');
      return;
    }

    setStatus('processing');

    try {
      const response = await fetch(`/api/receipts/${inserted.id}/process`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
      }
    } catch {
      // OCR failed silently — the receipt is still saved and can be edited manually later.
    }

    setStatus('success');
  }

  function reset() {
    setStatus('idle');
    setError(null);
    setPreview(null);
    setResult(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
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
