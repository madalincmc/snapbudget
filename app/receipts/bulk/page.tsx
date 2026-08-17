import { redirect } from 'next/navigation';
import { Images } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdMembership } from '@/lib/household/membership';
import { delay } from '@/lib/utils';
import { BulkUpload } from '@/components/bulk-upload';

/**
 * Several receipts at once — for the pile that accumulates over a week, where
 * the single-receipt screen's review step would have to be answered once per
 * photo.
 *
 * So there is no review here: each image is uploaded, read, and saved with
 * whatever OCR found. Anything it could not put an amount to is flagged on the
 * row with a way through to the receipt, which is the same screen that would
 * have been used to correct it anyway.
 */
export default async function BulkReceiptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const membership = await getHouseholdMembership(supabase, user.id);

  return (
    <div className="flex flex-1 justify-center px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="sb-rise flex flex-col items-center gap-3 text-center">
          <span className="bg-primary text-primary-foreground shadow-primary/25 sb-pop flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
            <Images className="h-7 w-7" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              Mai multe bonuri
            </h1>
            <p className="text-muted-foreground text-sm">
              Alege mai multe poze deodată. Fiecare bon e citit separat.
            </p>
          </div>
        </div>

        <div className="sb-rise w-full" style={delay(100)}>
          <BulkUpload userId={user.id} householdId={membership?.householdId ?? null} />
        </div>
      </div>
    </div>
  );
}
