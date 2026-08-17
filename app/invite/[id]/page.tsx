import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isExpired, daysLeft } from '@/lib/household/invitations';
import { acceptInvitation, declineInvitation } from '@/app/household/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { delay } from '@/lib/utils';

/**
 * Where an invitation link lands.
 *
 * Its own route rather than the dashboard banner, because the person opening
 * it is usually signed out and may not have an account at all: this is the one
 * page that can send them through Google and bring them back to the same
 * invitation afterwards.
 *
 * Reading the invitation is gated by RLS, not by code — the select policy
 * matches the invitation's email against the caller's JWT — so a link opened
 * by the wrong account finds nothing rather than leaking who was invited where.
 */
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Comes back here afterwards rather than to the dashboard, so the trip
  // through Google does not lose the invitation that started it.
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${id}`)}`);
  }

  const { data: invitation } = await supabase
    .from('household_invitations')
    .select('id, household_id, status, email, expires_at')
    .eq('id', id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: household } = invitation
    ? await supabase
        .from('households')
        .select('name')
        .eq('id', invitation.household_id)
        .maybeSingle()
    : { data: null };

  const problem = !invitation
    ? 'Invitația nu există sau nu este pentru contul cu care ești conectat.'
    : invitation.status !== 'pending'
      ? 'Invitația a fost deja folosită sau anulată.'
      : isExpired(invitation.expires_at)
        ? 'Invitația a expirat. Cere-i proprietarului să ți-o trimită din nou.'
        : membership
          ? 'Faci deja parte dintr-o gospodărie. Părăsește-o mai întâi, apoi deschide din nou invitația.'
          : null;

  const remaining = invitation ? daysLeft(invitation.expires_at) : 0;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="sb-rise flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <span className="bg-primary text-primary-foreground shadow-primary/25 sb-pop flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
          <Users className="h-7 w-7" />
        </span>

        {problem ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                Invitația nu poate fi acceptată
              </h1>
              <p className="text-muted-foreground text-sm">{problem}</p>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              Mergi la dashboard
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                Ai fost invitat în „{household?.name ?? 'o gospodărie'}”
              </h1>
              <p className="text-muted-foreground text-sm">
                Veți vedea aceleași totaluri: fiecare își adaugă bonurile, iar cheltuielile
                gospodăriei se adună la un loc.
              </p>
            </div>

            <Card className="w-full" style={delay(80)}>
              <CardContent className="flex flex-col gap-3">
                <form action={acceptInvitation}>
                  <input type="hidden" name="invitationId" value={invitation!.id} />
                  <Button type="submit" size="lg" className="h-12 w-full rounded-full">
                    Acceptă invitația
                  </Button>
                </form>

                <form action={declineInvitation}>
                  <input type="hidden" name="invitationId" value={invitation!.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="lg"
                    className="text-muted-foreground w-full rounded-full"
                  >
                    Refuză
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="text-muted-foreground text-xs">
              {remaining === 1 ? 'Valabilă încă o zi.' : `Valabilă încă ${remaining} zile.`}{' '}
              Invitația e pentru {invitation!.email}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
