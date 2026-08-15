import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Crown, FlaskConical } from 'lucide-react';
import { isMonthKey, monthKeyOf } from '@/lib/dashboard/aggregate';
import { buildHouseholdSpending } from '@/lib/household/spending';
import { DEMO_HOUSEHOLD_NAME, DEMO_ME, DEMO_MEMBERS, demoReceipts } from '@/lib/demo/fixtures';
import { PageHeader } from '@/components/page-header';
import { MemberAvatar } from '@/components/member-avatar';
import { MemberSpendingCard } from '@/components/member-spending';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { delay } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Demo — SnapBudget',
  description: 'O gospodărie cu doi membri și cheltuielile lor, fără cont.',
};

/**
 * The household screen, on a household that does not exist.
 *
 * Two things it is for. Someone can be shown what shared expenses look like
 * without handing over a Google account first — and the screen can be opened
 * on any deployment, preview included, to check it renders, which sign-in
 * otherwise makes impossible from anything but a browser someone is sitting
 * at.
 *
 * The rows come from `lib/demo/fixtures` and go through the same
 * buildHouseholdSpending the signed-in page uses, into the same card. A demo
 * that renders its own copy of the UI would keep working long after the real
 * one broke, which is the opposite of useful.
 */
export default async function DemoPage({
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
    <div className="flex flex-1 justify-center px-4 py-5">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <PageHeader
          title="Gospodărie"
          description="Cheltuiți din conturi separate, vedeți aceleași totaluri"
          backHref={null}
        />

        <Alert className="sb-rise" style={delay(30)}>
          <FlaskConical />
          <AlertTitle>Date de demonstrație</AlertTitle>
          <AlertDescription>
            Ana și Bogdan nu există, iar cheltuielile lor nu sunt salvate nicăieri. Ecranul este
            însă cel real, cu aceleași calcule.
          </AlertDescription>
        </Alert>

        <Card className="sb-rise" style={delay(60)}>
          <CardContent>
            <MemberSpendingCard
              spending={spending}
              meUserId={DEMO_ME}
              month={month}
              currentMonth={currentMonth}
              linkToDashboard={false}
            />
          </CardContent>
        </Card>

        {/* The roster, without the invite and remove controls: those are server
            actions that ask who you are, and here nobody is signed in. */}
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

        <div className="sb-rise flex flex-col items-center gap-2 pb-2" style={delay(300)}>
          <Button
            size="lg"
            className="h-11 rounded-full"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Începe cu gospodăria ta
            <ArrowRight />
          </Button>
          <p className="text-muted-foreground text-xs">Te conectezi cu contul Google.</p>
        </div>
      </div>
    </div>
  );
}
