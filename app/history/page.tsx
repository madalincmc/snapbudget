import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { HistoryList } from '@/components/history-list';
import { Button } from '@/components/ui/button';

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="bg-muted/40 flex flex-1 justify-center px-6 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-xl font-semibold">Istoric bonuri</h1>
          <Button
            variant="link"
            className="px-0"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            <ArrowLeft />
            Dashboard
          </Button>
        </div>

        <HistoryList />
      </div>
    </div>
  );
}
