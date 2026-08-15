import { Crown } from 'lucide-react';
import { isMonthKey, monthKeyOf } from '@/lib/dashboard/aggregate';
import { buildHouseholdSpending } from '@/lib/household/spending';
import { DEMO_HOUSEHOLD_NAME, DEMO_ME, DEMO_MEMBERS, demoReceipts } from '@/lib/demo/fixtures';
import { PageHeader } from '@/components/page-header';
import { MemberAvatar } from '@/components/member-avatar';
import { MemberSpendingCard } from '@/components/member-spending';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { delay } from '@/lib/utils';

/**
 * The household screen, on a household that does not exist.
 *
 * The breakdown card is the real one, fed by the real buildHouseholdSpending —
 * a demo that rendered its own copy of the UI would keep looking correct long
 * after the screen it stands in for broke. What is missing is the roster's
 * admin half: inviting and removing are server actions that ask who you are.
 */
export default async function DemoHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;

  const now = new Date();
  const currentMonth = monthKeyOf(now);
  const month = isMonthKey(monthParam) && monthParam <= currentMonth ? monthParam : currentMonth;

  const spending = buildHouseholdSpending(demoReceipts(now), DEMO_MEMBERS, month);

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <PageHeader
          title="Gospodărie"
          description="Cheltuiți din conturi separate, vedeți aceleași totaluri"
          backHref={null}
        />

        <Card className="sb-rise" style={delay(60)}>
          <CardContent>
            <MemberSpendingCard
              spending={spending}
              meUserId={DEMO_ME}
              month={month}
              currentMonth={currentMonth}
              dashboardPath="/demo"
            />
          </CardContent>
        </Card>

        <Card className="sb-rise" style={delay(130)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-foreground text-base font-medium">{DEMO_HOUSEHOLD_NAME}</p>
              <Badge variant="outline" className="gap-1">
                <Crown className="h-3 w-3" />
                Proprietar
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm font-medium">Membri</p>
            <ul className="flex flex-col gap-3">
              {DEMO_MEMBERS.map((m, index) => (
                <li
                  key={m.userId}
                  style={delay(190 + index * 50)}
                  className="sb-rise flex items-center gap-3"
                >
                  <MemberAvatar name={m.displayName} avatarUrl={m.avatarUrl} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-foreground truncate text-sm font-medium">
                      {m.displayName}
                      {m.userId === DEMO_ME && ' (tu)'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {m.role === 'owner' ? 'Proprietar' : 'Membru'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
