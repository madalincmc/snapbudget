import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdMembership, type HouseholdMemberInfo } from '@/lib/household/membership';
import { HistoryList } from '@/components/history-list';
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
        <h1 className="text-foreground px-1 text-lg font-semibold tracking-tight">Istoric</h1>
        <HistoryList
          members={members}
          meUserId={user.id}
          initial={{
            q: one('q'),
            category: one('category'),
            month: one('month'),
            year: one('year'),
            sort: one('sort'),
            who: one('who'),
          }}
        />
      </div>
      <BottomNav />
    </div>
  );
}
