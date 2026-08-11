import { redirect } from 'next/navigation';
import { Crown, Mail, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { delay } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  createHousehold,
  inviteMember,
  cancelInvitation,
  removeMember,
  leaveHousehold,
} from './actions';

function MemberAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className="h-10 w-10 flex-none rounded-full object-cover" />
    );
  }
  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="bg-accent text-accent-foreground flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-semibold">
      {initial}
    </div>
  );
}

export default async function HouseholdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id, household_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  // Reached from the bottom nav, so there is nowhere specific to go "back" to.
  const header = (
    <PageHeader
      title="Gospodărie"
      description="Cheltuiți din conturi separate, vedeți aceleași totaluri"
      backHref={null}
    />
  );

  if (!membership) {
    return (
      <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
        <div className="flex w-full max-w-lg flex-col gap-5">
          {header}
          <Card className="sb-rise" style={delay(60)}>
            <CardHeader>
              <p className="text-foreground text-base font-medium">Creează o gospodărie</p>
              <p className="text-muted-foreground text-sm">
                Invită partenerul sau familia să contribuie cu cheltuieli din propriul cont. Toată
                lumea vede totalurile combinate.
              </p>
            </CardHeader>
            <CardContent>
              <form action={createHousehold} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Nume gospodărie</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="ex: Familia Popescu"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" size="lg" className="mt-1 h-11 rounded-full">
                  Creează gospodăria
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const { data: household } = await supabase
    .from('households')
    .select('id, name')
    .eq('id', membership.household_id)
    .single();

  const { data: members } = await supabase
    .from('household_members')
    .select('id, user_id, role, display_name, email, avatar_url')
    .eq('household_id', membership.household_id)
    .order('joined_at', { ascending: true });

  const isOwner = membership.role === 'owner';

  const { data: invitations } = isOwner
    ? await supabase
        .from('household_invitations')
        .select('id, email, created_at')
        .eq('household_id', membership.household_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-lg flex-col gap-5">
        {header}

        <Card className="sb-rise" style={delay(60)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-foreground text-base font-medium">{household?.name}</p>
              {isOwner && (
                <Badge variant="outline" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Proprietar
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm font-medium">Membri</p>
            <ul className="flex flex-col gap-3">
              {(members ?? []).map((m, index) => (
                <li
                  key={m.id}
                  style={delay(120 + index * 50)}
                  className="sb-rise flex items-center gap-3"
                >
                  <MemberAvatar name={m.display_name} avatarUrl={m.avatar_url} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-foreground truncate text-sm font-medium">
                      {m.display_name ?? m.email ?? 'Membru'}
                      {m.user_id === user.id && ' (tu)'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {m.role === 'owner' ? 'Proprietar' : 'Membru'}
                    </span>
                  </div>

                  {isOwner && m.user_id !== user.id && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" className="text-destructive">
                            <X />
                            <span className="sr-only">Elimină membru</span>
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Elimini acest membru?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {m.display_name ?? m.email} nu va mai avea acces la gospodărie.
                            Cheltuielile deja adăugate rămân neschimbate.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <form action={removeMember.bind(null, m.id)}>
                            <AlertDialogAction type="submit" variant="destructive">
                              Elimină
                            </AlertDialogAction>
                          </form>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </li>
              ))}
            </ul>

            {!isOwner && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="outline" className="mt-2 self-start">
                      Părăsește gospodăria
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Părăsești gospodăria?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Nu vei mai vedea cheltuielile celorlalți membri, iar cheltuielile tale
                      viitoare nu vor mai fi partajate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anulează</AlertDialogCancel>
                    <form action={leaveHousehold}>
                      <input type="hidden" name="memberId" value={membership.id} />
                      <AlertDialogAction type="submit" variant="destructive">
                        Părăsește
                      </AlertDialogAction>
                    </form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="sb-rise" style={delay(160)}>
            <CardHeader>
              <p className="text-foreground text-base font-medium">Invită un membru</p>
              <p className="text-muted-foreground text-sm">
                Persoana invitată va putea accepta după ce se conectează cu contul ei Google,
                folosind exact această adresă de email.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form action={inviteMember} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nume@exemplu.com"
                    required
                  />
                </div>
                <Button type="submit" className="h-10 sm:h-9">
                  Trimite invitația
                </Button>
              </form>

              {(invitations ?? []).length > 0 && (
                <ul className="divide-border flex flex-col divide-y">
                  {(invitations ?? []).map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 py-2">
                      <Mail className="text-muted-foreground h-4 w-4 flex-none" />
                      <span className="text-foreground min-w-0 flex-1 truncate text-sm">
                        {inv.email}
                      </span>
                      <Badge variant="outline">În așteptare</Badge>
                      <form action={cancelInvitation.bind(null, inv.id)}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                        >
                          <X />
                          <span className="sr-only">Anulează invitația</span>
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
