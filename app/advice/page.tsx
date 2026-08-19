import { redirect } from 'next/navigation';
import { PiggyBank, Target, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { delay } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { BottomNav } from '@/components/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';

const ADVICE = [
  {
    icon: TrendingUp,
    title: 'Urmărește-ți cheltuielile zilnic',
    description:
      'Notează fiecare cheltuială, chiar și cele mici — cash-ul e primul loc pe unde scapă banii neobservat.',
  },
  {
    icon: Target,
    title: 'Pune-ți un buget lunar',
    description:
      'Un buget clar pe categorii îți arată din timp când o lună o ia razna, nu abia la final.',
  },
  {
    icon: PiggyBank,
    title: 'Pune deoparte înainte să cheltui',
    description:
      'Tratează economisirea ca pe o cheltuială fixă, nu ca pe ce rămâne la finalul lunii.',
  },
];

export default async function AdvicePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-lg flex-col gap-5">
        {/* Reached from the bottom nav, so there is no single place to go back to. */}
        <PageHeader
          title="Sfaturi"
          description="Câteva idei simple, ca să-ți fie mai ușor să-ți controlezi bugetul"
          backHref={null}
        />

        <Card className="sb-rise" style={delay(60)}>
          <CardContent>
            <ul className="divide-border flex flex-col divide-y">
              {ADVICE.map(({ icon: Icon, title, description }, index) => (
                <li
                  key={title}
                  style={delay(100 + index * 45)}
                  className="sb-rise flex items-start gap-3 py-3"
                >
                  <div className="bg-accent text-accent-foreground flex h-10 w-10 flex-none items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-foreground text-sm font-medium">{title}</span>
                    <span className="text-muted-foreground text-xs">{description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
