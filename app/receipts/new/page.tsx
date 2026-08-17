import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { delay } from '@/lib/utils';
import { ReceiptUploadForm } from '@/components/receipt-upload-form';
import { Button } from '@/components/ui/button';

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="sb-rise flex flex-col items-center gap-3 text-center">
        <span className="bg-primary text-primary-foreground shadow-primary/25 sb-pop flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
          <Camera className="h-7 w-7" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Adaugă bon</h1>
          <p className="text-muted-foreground text-sm">
            Fotografiază bonul sau alege o poză din galerie.
          </p>
        </div>
      </div>

      <div className="sb-rise w-full max-w-sm" style={delay(100)}>
        <ReceiptUploadForm userId={user.id} />
      </div>

      <div className="sb-fade flex flex-col items-center gap-1" style={delay(200)}>
        {/* A pile saved up over a week goes through the batch screen instead:
            answering this screen's review step once per photo is the thing
            that makes backfilling not worth starting. */}
        <Button variant="link" nativeButton={false} render={<Link href="/receipts/bulk" />}>
          Ai mai multe bonuri? Încarcă-le pe toate
        </Button>
        {/* The bottom-nav button goes straight to scanning, so cash and other
            receipt-less spending needs a visible way out from here. */}
        <Button variant="link" nativeButton={false} render={<Link href="/expenses/new" />}>
          Nu ai bon? Adaugă manual
        </Button>
        <Button
          variant="link"
          className="text-muted-foreground"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft />
          Înapoi la dashboard
        </Button>
      </div>
    </div>
  );
}
