import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
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
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Adaugă bon</h1>
        <p className="text-muted-foreground">Fotografiază bonul sau alege o poză din galerie.</p>
      </div>
      <ReceiptUploadForm userId={user.id} />

      <div className="flex flex-col items-center gap-1">
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
