import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdMembership, type HouseholdMemberInfo } from '@/lib/household/membership';
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

  const membership = await getHouseholdMembership(supabase, user.id);
  let members: HouseholdMemberInfo[] = [];
  if (membership) {
    const { data } = await supabase
      .from('household_members')
      .select('user_id, display_name, avatar_url')
      .eq('household_id', membership.householdId);
    members = (data ?? []).map((m) => ({
      userId: m.user_id,
      displayName: m.display_name,
      avatarUrl: m.avatar_url,
    }));
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

        <HistoryList members={members} meUserId={user.id} />
      </div>
    </div>
  );
}
