import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdMembership, type HouseholdMemberInfo } from '@/lib/household/membership';
import { HistoryList } from '@/components/history-list';
import { PageHeader } from '@/components/page-header';
import { BottomNav } from '@/components/bottom-nav';

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : undefined;
  };
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
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        {/* Reached from the bottom nav, so there is no single place to go back to. */}
        <PageHeader
          title="Istoric"
          description="Caută, filtrează și sortează toate cheltuielile"
          backHref={null}
        />
        <HistoryList
          members={members}
          meUserId={user.id}
          initial={{
            q: one('q'),
            category: one('category'),
            period: one('period'),
            from: one('from'),
            to: one('to'),
            sort: one('sort'),
            who: one('who'),
            // Still read so a link shared before the date range existed opens
            // on the month it was pointing at.
            month: one('month'),
            year: one('year'),
          }}
        />
      </div>
      <BottomNav />
    </div>
  );
}
