import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Plus, Repeat2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatListDate } from '@/lib/dashboard/format';
import { FREQUENCY_LABEL, type RecurringExpense } from '@/lib/recurring';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { pauseRecurring, resumeRecurring } from './actions';

export default async function RecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('recurring_expenses')
    .select('id, title, amount, category, subcategory, frequency, start_date, next_due_date, paused, notes')
    .order('paused', { ascending: true })
    .order('next_due_date', { ascending: true });

  const rules = (data ?? []) as RecurringExpense[];

  return (
    <div className="bg-muted/40 pb-nav flex flex-1 justify-center px-4 pt-6">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <h1 className="text-foreground text-lg font-semibold">Cheltuieli recurente</h1>
          <Button
            variant="link"
            className="text-muted-foreground px-0"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            <ArrowLeft />
            Dashboard
          </Button>
        </div>

        {rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-2xl">
                <Repeat2 className="h-7 w-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-foreground text-base font-medium">Nicio cheltuială recurentă</h2>
                <p className="text-muted-foreground mx-auto max-w-xs text-sm">
                  Chirie, abonamente, utilități, asigurări — le adaugi o dată și apar automat la
                  fiecare scadență.
                </p>
              </div>
              <Button
                size="lg"
                className="h-11 rounded-full"
                nativeButton={false}
                render={<Link href="/recurring/new" />}
              >
                <Plus />
                Adaugă prima recurentă
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent>
                <ul className="divide-border flex flex-col divide-y">
                  {rules.map((rule) => (
                    <li key={rule.id} className="flex items-center gap-3 py-3">
                      <div
                        className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
                          rule.paused
                            ? 'bg-muted text-muted-foreground/60'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Repeat2 className="h-5 w-5" />
                      </div>

                      <Link
                        href={`/recurring/${rule.id}`}
                        className="flex min-w-0 flex-1 flex-col gap-0.5"
                      >
                        <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{rule.title}</span>
                          {rule.paused && <Badge variant="outline">Pe pauză</Badge>}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {FREQUENCY_LABEL[rule.frequency]}
                          {!rule.paused && ` · următoarea ${formatListDate(rule.next_due_date)}`}
                        </span>
                      </Link>

                      {/* Only the pause toggle stays inline. At phone width an
                          amount plus three icon buttons left roughly 120px for
                          the title, which truncated most names to a letter or
                          two; edit and delete live on the rule's own page. */}
                      <div className="flex flex-none items-center gap-1">
                        <span className="text-foreground text-sm font-medium tabular-nums">
                          {Number(rule.amount).toFixed(2)} lei
                        </span>

                        <form
                          action={
                            rule.paused
                              ? resumeRecurring.bind(null, rule.id)
                              : pauseRecurring.bind(null, rule.id)
                          }
                        >
                          <Button type="submit" variant="ghost" size="icon-sm">
                            {rule.paused ? <Play /> : <Pause />}
                            <span className="sr-only">
                              {rule.paused ? 'Reia' : 'Pune pe pauză'}
                            </span>
                          </Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              size="lg"
              className="h-11 rounded-full"
              nativeButton={false}
              render={<Link href="/recurring/new" />}
            >
              <Plus />
              Adaugă recurentă
            </Button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
