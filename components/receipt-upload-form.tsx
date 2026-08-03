'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

type Status = 'idle' | 'uploading' | 'success' | 'error';

export function ReceiptUploadForm({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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

    const { error: insertError } = await supabase
      .from('receipts')
      .insert({ user_id: userId, storage_path: path, status: 'pending' });

    if (insertError) {
      setStatus('error');
      setError(insertError.message);
      return;
    }

    setStatus('success');
  }

  function reset() {
    setStatus('idle');
    setError(null);
    setPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-medium text-black dark:text-zinc-50">Bon adăugat!</p>
        <button
          type="button"
          onClick={reset}
          className="h-12 rounded-full border border-black/[.08] px-6 font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-white dark:hover:bg-[#1a1a1a]"
        >
          Adaugă alt bon
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {preview && status === 'uploading' && (
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

      <button
        type="button"
        disabled={status === 'uploading'}
        onClick={() => cameraInputRef.current?.click()}
        className="bg-foreground text-background flex h-12 w-64 items-center justify-center rounded-full px-5 font-medium transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {status === 'uploading' ? 'Se încarcă…' : 'Fă o poză'}
      </button>
      <button
        type="button"
        disabled={status === 'uploading'}
        onClick={() => galleryInputRef.current?.click()}
        className="flex h-12 w-64 items-center justify-center rounded-full border border-black/[.08] px-5 font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:text-white dark:hover:bg-[#1a1a1a]"
      >
        Alege din galerie
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
