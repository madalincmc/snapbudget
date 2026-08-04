'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HouseholdMemberInfo } from '@/lib/household/membership';

export function HouseholdFilter({
  members,
  meUserId,
}: {
  members: HouseholdMemberInfo[];
  meUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('who') ?? 'all';

  const items: Record<string, string> = {
    all: 'Toți',
    me: 'Eu',
    ...Object.fromEntries(
      members
        .filter((m) => m.userId !== meUserId)
        .map((m) => [m.userId, m.displayName ?? 'Membru']),
    ),
  };

  function handleChange(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') {
      params.delete('who');
    } else {
      params.set('who', value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Select items={items} value={current} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-auto text-xs">
        <SelectValue placeholder="Cine" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
