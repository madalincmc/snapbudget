import type { SupabaseClient } from '@supabase/supabase-js';

export interface HouseholdMembership {
  householdId: string;
  role: 'owner' | 'member';
}

export interface HouseholdMemberInfo {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function getHouseholdMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<HouseholdMembership | null> {
  const { data } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return { householdId: data.household_id, role: data.role as 'owner' | 'member' };
}
