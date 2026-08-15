import Link from 'next/link';
import { Camera, Repeat2, Users } from 'lucide-react';
import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Card, CardContent } from '@/components/ui/card';
import { delay } from '@/lib/utils';

const PROMISES = [
  { icon: Camera, text: 'Fotografiezi bonul, completăm noi magazinul, suma și data' },
  { icon: Repeat2, text: 'Chiria și abonamentele se adaugă singure, la scadență' },
  { icon: Users, text: 'Toată gospodăria contribuie la aceleași totaluri' },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* The screen that used to be a card with two lines of text in it. It
            is the only page a new account sees before signing in, so it is
            worth saying what the app does rather than only what it is called. */}
        <div className="sb-rise flex flex-col items-center gap-3 text-center">
          <span className="bg-primary text-primary-foreground shadow-primary/25 sb-pop flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
            <Camera className="h-7 w-7" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">SnapBudget</h1>
            <p className="text-muted-foreground text-sm">
              Fotografiază bonul, restul îl facem noi.
            </p>
          </div>
        </div>

        <Card className="sb-rise" style={delay(100)}>
          <CardContent className="flex flex-col gap-5">
            <ul className="flex flex-col gap-3">
              {PROMISES.map(({ icon: Icon, text }, index) => (
                <li
                  key={text}
                  style={delay(180 + index * 70)}
                  className="sb-rise flex items-start gap-3"
                >
                  <span className="bg-accent text-accent-foreground flex h-8 w-8 flex-none items-center justify-center rounded-lg">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-muted-foreground pt-1.5 text-xs leading-snug">{text}</span>
                </li>
              ))}
            </ul>

            <div className="sb-rise flex flex-col items-center gap-3" style={delay(400)}>
              <GoogleSignInButton next={next ?? '/dashboard'} />
              {/* Somewhere to go for anyone not ready to hand over an account
                  on the strength of three bullet points. */}
              <Link
                href="/demo"
                className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                Vezi întâi un demo, fără cont
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
