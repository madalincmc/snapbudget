import { Users } from 'lucide-react';
import { acceptInvitation, declineInvitation } from '@/app/household/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PendingInvitation {
  id: string;
  householdName: string;
}

export function PendingInvitationsBanner({ invitations }: { invitations: PendingInvitation[] }) {
  if (invitations.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {invitations.map((inv) => (
        <Card key={inv.id} className="ring-primary/30">
          <CardContent className="flex flex-wrap items-center gap-3">
            <Users className="text-muted-foreground h-5 w-5 flex-none" />
            <p className="text-foreground min-w-0 flex-1 text-sm">
              Ai fost invitat în gospodăria <strong>{inv.householdName}</strong>.
            </p>
            <div className="flex flex-none gap-2">
              <form action={declineInvitation}>
                <input type="hidden" name="invitationId" value={inv.id} />
                <Button type="submit" variant="outline" size="sm">
                  Refuză
                </Button>
              </form>
              <form action={acceptInvitation}>
                <input type="hidden" name="invitationId" value={inv.id} />
                <Button type="submit" size="sm">
                  Acceptă
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
